import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  getBooks,
  getChapterCount,
  getChapterVerses,
  TRANSLATIONS,
  type Book,
  type Translation,
  type Verse,
  DEFAULT_TRANSLATION,
} from '@/db/bible';
import { BookChapterPicker } from '@/features/bible/BookChapterPicker';
import {
  BookmarkSheet,
  positionLabel,
  type BookmarkWithBook,
} from '@/features/bible/BookmarkSheet';
import { VerseActionSheet } from '@/features/notes/VerseActionSheet';
import {
  addBookmark,
  deleteBookmark,
  deleteMark,
  getBookmarks,
  getMarksForChapter,
  upsertMark,
  COMMENTARY_HIGHLIGHT_COLORS,
  HIGHLIGHT_COLORS,
  type VerseMark,
} from '@/db/userData';
import { pingCheckin } from '@/db/r2m';

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 28;

// 구절을 꾹 눌러 색칠·묵상 창을 여는 시간.
//
// 절마다 연필을 달아 두면 본문이 어수선해져서 없앴다. 대신 구절 자체를 누른다.
// 길이는 휴대폰이 글자를 잡을 때 쓰는 시간과 같게 맞췄다 — 손에 익은 감각이라
// 따로 배우지 않아도 된다. 이보다 길면 눌러 놓고도 "안 되는데?" 하고 손을 뗀다.
const LONG_PRESS_MS = 500;
// 누르고 있다는 표시(구절이 살짝 흐려짐)를 켜기까지 기다리는 시간.
// 화면을 넘길 때 스치는 손가락마다 깜빡이지 않도록 조금 늦춘다.
// 이 시간만큼 길게 누르기 시작점도 뒤로 밀리므로, 실제로 창이 열리기까지는
// 두 값을 더한 만큼(약 0.7초) 걸린다.
const HOLD_FEEDBACK_MS = 160;
const LONG_PRESS_HINT_KEY = 'read.longPressHintSeen';

// 앱을 끄고 다시 들어와도 보던 자리로 돌아오게 하는 기록.
//
// 책갈피와는 다른 것이다. 책갈피는 사람이 일부러 꽂아 두는 것이고, 이건 아무것도
// 안 해도 알아서 남는 마지막 자리다. 둘 다 있어야 한다 — 어제 읽다 만 데서
// 이어 읽고 싶은 마음과, 두고두고 다시 펴 볼 자리를 표시해 두고 싶은 마음은
// 서로 다르다.
const LAST_POSITION_KEY = 'read.lastPosition';

type LastPosition = {
  bookId: number;
  chapter: number;
  translation: Translation;
  /** 그때 내려와 있던 만큼과, 그때 잰 본문 전체 높이. 글자 크기가 바뀌어도
   *  둘의 비로 환산하면 같은 자리로 돌아간다. */
  y: number;
  contentHeight: number;
};

export default function ReadScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ bookId?: string; chapter?: string }>();

  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState(1);
  const [chapterCount, setChapterCount] = useState(1);
  const [translation, setTranslation] = useState<Translation>(DEFAULT_TRANSLATION);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [marks, setMarks] = useState<VerseMark[]>([]);
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkWithBook[]>([]);
  const [bookmarkSheetVisible, setBookmarkSheetVisible] = useState(false);
  // 저장된 자리를 다 읽어 보기 전에는 "첫 책 1장"을 기본값으로 밀어 넣지 않는다.
  // 그러지 않으면 창세기 1장이 잠깐 떴다가 원래 자리로 튀는 게 보인다.
  const [resumeChecked, setResumeChecked] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const contentHeight = useRef(0);
  // 본문이 다 그려진 뒤에 데려다 놓을 자리. 그리기 전에 scrollTo를 부르면 갈
  // 곳이 아직 없어서 그냥 맨 위에 남는다.
  const pendingScroll = useRef<{ y: number; contentHeight: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 절마다 본문 안에서의 세로 위치. 책갈피 이름을 "뒷부분"이 아니라 "12절"로
  // 적기 위한 것뿐이라, 못 재도(빈 채로 남아도) 책갈피는 그대로 동작한다.
  // 값은 textColumn 기준이므로 columnOffset을 더해야 스크롤 값과 견줄 수 있다.
  const verseOffsets = useRef(new Map<number, number>());
  const columnOffset = useRef(0);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // 꾹 누르는 법을 한 번도 안 써 본 사람에게만 안내를 보여 준다. 연필이 사라진
  // 자리를 대신하는 장치라, 한 번 써 본 뒤에는 다시 띄우지 않는다.
  useEffect(() => {
    AsyncStorage.getItem(LONG_PRESS_HINT_KEY)
      .then((seen) => setShowHint(seen !== '1'))
      .catch(() => {});
  }, []);

  // 마지막으로 보던 자리 복원. 다른 화면에서 절을 눌러 들어온 경우(params)에는
  // 그쪽이 우선이므로 건드리지 않는다.
  useEffect(() => {
    if (params.bookId) {
      setResumeChecked(true);
      return;
    }
    AsyncStorage.getItem(LAST_POSITION_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw) as LastPosition;
            if (saved?.bookId) {
              setBookId(saved.bookId);
              setChapter(saved.chapter ?? 1);
              if (saved.translation) setTranslation(saved.translation);
              if (saved.y > 0) {
                pendingScroll.current = { y: saved.y, contentHeight: saved.contentHeight };
              }
            }
          } catch {
            // 저장된 값이 깨졌으면 그냥 평소대로 첫 책부터 시작한다.
          }
        }
      })
      .catch(() => {})
      .finally(() => setResumeChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openVerse(verse: Verse) {
    setActiveVerse(verse);
    if (showHint) {
      setShowHint(false);
      AsyncStorage.setItem(LONG_PRESS_HINT_KEY, '1').catch(() => {});
    }
  }

  async function refreshMarks() {
    if (bookId == null) return;
    setMarks(await getMarksForChapter(bookId, chapter, translation));
  }

  useEffect(() => {
    getBooks(db).then(setBooks);
  }, [db]);

  // Re-syncs whenever bookId/chapter are passed in fresh (e.g. tapping a verse
  // in Notes/Search/Home) — expo-router keeps this tab screen mounted, so a
  // one-time-on-mount effect would miss params changing on a later navigation
  // to the already-mounted /read screen.
  useEffect(() => {
    if (params.bookId) {
      setBookId(Number(params.bookId));
      setChapter(params.chapter ? Number(params.chapter) : 1);
    } else if (resumeChecked && bookId == null && books.length > 0) {
      setBookId(books[0].id);
      setChapter(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.bookId, params.chapter, books, resumeChecked]);

  useEffect(() => {
    if (bookId == null) return;
    getChapterCount(db, bookId).then(setChapterCount);
  }, [db, bookId]);

  useEffect(() => {
    if (bookId == null) return;
    // 장이 바뀌면 앞 장에서 잰 위치는 남의 것이다. 지우지 않으면 아직 새 본문이
    // 그려지기 전에 책갈피를 꽂았을 때 앞 장의 절 번호가 딸려 붙는다.
    verseOffsets.current.clear();
    getChapterVerses(db, bookId, chapter, translation).then(setVerses);
    refreshMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, bookId, chapter, translation]);

  const currentBook = books.find((b) => b.id === bookId);

  // 보던 자리를 남긴다.
  const saveLastPosition = useCallback(() => {
    if (bookId == null || verses.length === 0) return;
    // 아직 아까 그 자리로 데려다 놓기 전이다. 지금 적으면 맨 위(0)를 적게 되어
    // 정작 복원하려던 자리를 스스로 지워 버린다.
    if (pendingScroll.current) return;
    const position: LastPosition = {
      bookId,
      chapter,
      translation,
      y: scrollY.current,
      contentHeight: contentHeight.current,
    };
    AsyncStorage.setItem(LAST_POSITION_KEY, JSON.stringify(position)).catch(() => {});
  }, [bookId, chapter, translation, verses.length]);

  useEffect(() => {
    saveLastPosition();
  }, [saveLastPosition]);

  // 자리로 데려다 놓는 일은 본문 높이가 다시 잡혔다는 신호(onContentSizeChange)로
  // 하는 게 맞다. 다만 그 신호는 화면을 그려야 오는 것이라, 안 그려지는 상황이나
  // 늦게 오는 기기에서는 영영 제자리에 머문다. 조금 기다렸다가 한 번 더 밀어
  // 준다 — 앞서 처리됐으면 여긴 아무 일도 하지 않는다.
  useEffect(() => {
    if (!pendingScroll.current || verses.length === 0) return;
    const timer = setTimeout(() => applyPendingScroll(contentHeight.current), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses]);

  const refreshBookmarks = useCallback(async () => {
    const rows = await getBookmarks();
    const bookById = new Map(books.map((b) => [b.id, b]));
    setBookmarks(
      rows.map((b) => ({ ...b, bookName: bookById.get(b.book_id)?.name_ko ?? '' }))
    );
  }, [books]);

  useEffect(() => {
    if (books.length === 0) return;
    refreshBookmarks();
  }, [books.length, refreshBookmarks]);

  const highlightHex = (color: string | null) =>
    [...HIGHLIGHT_COLORS, ...COMMENTARY_HIGHLIGHT_COLORS].find((c) => c.code === color)?.hex ?? null;

  function goToChapter(delta: number) {
    const next = chapter + delta;
    if (next < 1 || next > chapterCount) return;
    // 새 장은 처음부터 읽는다. 이 줄이 없으면 앞 장에서 내려 둔 만큼 내려간
    // 자리에서 시작해 첫머리를 놓친다.
    scrollY.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setChapter(next);
  }

  /**
   * 본문이 다 그려졌을 때, 데려다 놓기로 한 자리가 있으면 그리로 옮긴다.
   *
   * 잰 때와 지금의 글자 크기가 다르면 전체 높이도 달라지므로 그 비로 환산한다.
   * (예: 글자를 키워 본문이 1.2배 길어졌으면 내려갈 거리도 1.2배)
   */
  function applyPendingScroll(measuredHeight: number) {
    const pending = pendingScroll.current;
    if (!pending) return;
    pendingScroll.current = null;
    // 새로 잰 높이를 못 받았으면 저장할 때의 높이를 그대로 쓴다. 그 사이 글자
    // 크기를 바꾸지 않았다면 이게 정답이고, 바꿨더라도 아예 못 돌아가는 것보다는
    // 가까운 자리에 내려놓는 편이 낫다.
    const height = measuredHeight > 0 ? measuredHeight : pending.contentHeight;
    const ratio = pending.contentHeight > 0 && height > 0 ? height / pending.contentHeight : 1;
    // 높이를 모를 때는 자르지 않는다. 0으로 자르면 애써 기억해 둔 자리를 버리고
    // 맨 위로 돌아가 버린다. 넘치는 값은 어차피 ScrollView가 알아서 막아 준다.
    const target = pending.y * ratio;
    const y = height > 0 ? Math.max(0, Math.min(target, height)) : Math.max(0, target);
    scrollY.current = y;
    scrollRef.current?.scrollTo({ y, animated: false });
    // 복원이 끝났으니 이제 이 자리를 마지막 자리로 적어 둔다. 여기서 안 적으면
    // 돌아온 뒤 한 번도 안 굴리고 나갔을 때 자리가 사라진다.
    saveLastPosition();
  }

  /**
   * 지금 화면 맨 위에 걸쳐 있는 절 번호. 못 재 뒀으면 null.
   *
   * "맨 위에 보이는 절"은 시작점이 화면 위로 이미 지나간 절 중 가장 아래 것이다
   * (절 하나가 화면보다 길 수도 있으므로 "시작점이 화면 안에 있는 첫 절"로 잡으면
   * 긴 절을 읽던 중에 다음 절 번호가 나온다). 여백 몇 픽셀은 봐 준다.
   */
  function verseAtTop(y: number): number | null {
    if (verseOffsets.current.size === 0) return null;
    // 절의 위치는 textColumn 기준이라, 스크롤 값에서 그 시작점을 빼고 견준다.
    const line = y - columnOffset.current + 4;
    let best: number | null = null;
    let bestTop = -Infinity;
    for (const [verse, top] of verseOffsets.current) {
      if (top <= line && top > bestTop) {
        bestTop = top;
        best = verse;
      }
    }
    // 맨 위보다 더 위(음수 스크롤 등)라면 첫 절로 본다.
    if (best == null) {
      let first: number | null = null;
      let firstTop = Infinity;
      for (const [verse, top] of verseOffsets.current) {
        if (top < firstTop) {
          firstTop = top;
          first = verse;
        }
      }
      return first;
    }
    return best;
  }

  // 책갈피는 한 장에 하나다. 같은 장을 보고 있으면 그게 지금의 책갈피다.
  const currentBookmark =
    bookId == null
      ? null
      : (bookmarks.find((b) => b.book_id === bookId && b.chapter === chapter) ?? null);

  // 창을 여는 순간 다시 그려지므로, 그때의 스크롤 위치로 이름이 지어진다.
  const currentLabel = currentBook
    ? positionLabel(
        currentBook.name_ko,
        chapter,
        verseAtTop(scrollY.current),
        scrollY.current,
        contentHeight.current
      )
    : '';

  async function handleAddBookmark() {
    if (bookId == null) return;
    await addBookmark({
      bookId,
      chapter,
      translation,
      scrollY: scrollY.current,
      contentHeight: contentHeight.current,
      verse: verseAtTop(scrollY.current),
    });
    await refreshBookmarks();
    setBookmarkSheetVisible(false);
  }

  async function handleDeleteBookmark(bookmark: BookmarkWithBook) {
    await deleteBookmark(bookmark.id);
    await refreshBookmarks();
  }

  function handleJumpToBookmark(bookmark: BookmarkWithBook) {
    setBookmarkSheetVisible(false);
    pendingScroll.current = { y: bookmark.scroll_y, contentHeight: bookmark.content_height };
    if (bookmark.book_id === bookId && bookmark.chapter === chapter) {
      // 같은 장이라 다시 그릴 일이 없다 — 지금 높이를 그대로 써서 바로 옮긴다.
      applyPendingScroll(contentHeight.current);
      return;
    }
    setBookId(bookmark.book_id);
    setChapter(bookmark.chapter);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = e.nativeEvent.contentOffset.y;
    if (e.nativeEvent.contentSize?.height) contentHeight.current = e.nativeEvent.contentSize.height;
    // 손을 뗀 시점(onScrollEndDrag·onMomentumScrollEnd)에 저장하면 깔끔하지만,
    // 웹에서는 그 두 신호가 오지 않는다. 스크롤이 멎은 뒤에 한 번만 적도록
    // 여기서 직접 시간을 잰다 — 굴리는 내내 저장하는 낭비도 함께 막는다.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveLastPosition, 500);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={[styles.container, { backgroundColor: theme.readingBackground }]}>
        <View style={styles.toolbar}>
          <Pressable
            onPress={() => setPickerVisible(true)}
            style={[styles.bookButton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">
              {currentBook ? `${currentBook.name_ko} ${chapter}장` : '선택'}
            </ThemedText>
          </Pressable>

          <View style={styles.toolbarRight}>
            {TRANSLATIONS.map((t) => (
              <Pressable
                key={t.code}
                onPress={() => setTranslation(t.code)}
                style={[
                  styles.translationChip,
                  {
                    backgroundColor:
                      translation === t.code ? theme.backgroundSelected : theme.backgroundElement,
                  },
                ]}>
                <ThemedText type="small">{t.label}</ThemedText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setFontSize((s) => Math.max(MIN_FONT_SIZE, s - 2))}
              style={[styles.fontButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">A-</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setFontSize((s) => Math.min(MAX_FONT_SIZE, s + 2))}
              style={[styles.fontButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">A+</ThemedText>
            </Pressable>
          </View>
        </View>

        {showHint ? (
          <View style={styles.hintWrap}>
            <Pressable
              onPress={() => {
                setShowHint(false);
                AsyncStorage.setItem(LONG_PRESS_HINT_KEY, '1').catch(() => {});
              }}
              style={[styles.hintRow, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
                구절을 잠시 누르고 있으면 색칠하고 묵상을 적을 수 있어요
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
          scrollEventThrottle={100}
          onScroll={handleScroll}
          onContentSizeChange={(_w, h) => {
            contentHeight.current = h;
            applyPendingScroll(h);
          }}>
          <View
            style={styles.textColumn}
            onLayout={(e) => {
              columnOffset.current = e.nativeEvent.layout.y;
            }}>
            {verses.map((v) => {
              const mark = marks.find((m) => m.verse === v.verse);
              const bg = highlightHex(mark?.color ?? null);
              return (
                <Pressable
                  key={v.id}
                  onLayout={(e) => {
                    verseOffsets.current.set(v.verse, e.nativeEvent.layout.y);
                  }}
                  onLongPress={() => openVerse(v)}
                  delayLongPress={LONG_PRESS_MS}
                  unstable_pressDelay={HOLD_FEEDBACK_MS}
                  style={({ pressed }) => [
                    styles.verseRow,
                    bg ? { backgroundColor: bg } : null,
                    pressed ? styles.verseRowHolding : null,
                  ]}>
                  <ThemedText style={[styles.verseText, { fontSize, lineHeight: fontSize * 1.6 }]}>
                    <ThemedText
                      themeColor={bg ? undefined : 'textSecondary'}
                      style={[{ fontSize: fontSize * 0.6 }, bg ? styles.verseNumOnHighlight : null]}>
                      {v.verse}{' '}
                    </ThemedText>
                    {/* 안쪽 Text에도 서체를 다시 준다 — React Native는 중첩된
                        Text가 자기 fontFamily를 가지면 바깥 것을 물려받지 않아,
                        여기에 안 주면 기본 서체가 명조를 덮어쓴다. */}
                    <ThemedText style={[styles.verseText, bg ? styles.textOnHighlight : null]}>
                      {v.text}
                    </ThemedText>
                    {/* 묵상을 적어 둔 절에만 붙는 표시. 연필과 달리 적어 둔 절에만
                        나오므로 본문을 어지럽히지 않으면서 "여기 뭔가 썼다"를 알려 준다. */}
                    {mark?.note ? (
                      <ThemedText style={{ fontSize: fontSize * 0.7 }}> 📝</ThemedText>
                    ) : null}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.pagerRow}>
          <Pressable
            onPress={() => goToChapter(-1)}
            disabled={chapter <= 1}
            style={[styles.pagerButton, { opacity: chapter <= 1 ? 0.4 : 1 }]}>
            <ThemedText type="link">이전 장</ThemedText>
          </Pressable>
          {/* 장을 넘기는 두 단추 사이의 빈 자리에 둔다. 실제 책에서 책갈피를
              꽂는 손짓과 자리가 같아서 따로 찾을 필요가 없다. */}
          <Pressable
            onPress={() => setBookmarkSheetVisible(true)}
            style={[
              styles.bookmarkButton,
              { backgroundColor: currentBookmark ? theme.backgroundSelected : 'transparent' },
            ]}>
            <ThemedText type="small">{currentBookmark ? '🔖 꽂힘' : '🔖 책갈피'}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => goToChapter(1)}
            disabled={chapter >= chapterCount}
            style={[styles.pagerButton, { opacity: chapter >= chapterCount ? 0.4 : 1 }]}>
            <ThemedText type="link">다음 장</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <BookChapterPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        books={books}
        onSelect={(selectedBookId, selectedChapter) => {
          scrollY.current = 0;
          scrollRef.current?.scrollTo({ y: 0, animated: false });
          setBookId(selectedBookId);
          setChapter(selectedChapter);
        }}
      />

      <BookmarkSheet
        visible={bookmarkSheetVisible}
        currentLabel={currentLabel}
        currentBookmark={currentBookmark}
        bookmarks={bookmarks}
        onAdd={handleAddBookmark}
        onJump={handleJumpToBookmark}
        onDelete={handleDeleteBookmark}
        onClose={() => setBookmarkSheetVisible(false)}
      />

      <VerseActionSheet
        visible={activeVerse != null}
        verseNumber={activeVerse?.verse ?? null}
        verseText={activeVerse?.text ?? ''}
        existingMark={marks.find((m) => m.verse === activeVerse?.verse) ?? null}
        onClose={() => setActiveVerse(null)}
        onSave={async (color, note) => {
          if (!activeVerse || bookId == null) return;
          await upsertMark({
            bookId,
            chapter,
            verse: activeVerse.verse,
            translation,
            color,
            note,
          });
          await refreshMarks();
          setActiveVerse(null);
          // R2M "묵상" 오늘의 훈련 항목 — 구절 하이라이트/노트를 남기면 완료로 표시.
          if (session) {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            pingCheckin(session.user.id, dateStr, { meditation: true }).catch(() => {});
          }
        }}
        onDelete={async () => {
          const existing = marks.find((m) => m.verse === activeVerse?.verse);
          if (!existing) return;
          await deleteMark(existing.id);
          await refreshMarks();
          setActiveVerse(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
  toolbar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  bookButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  translationChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  fontButton: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.four,
  },
  textColumn: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  verseText: {
    // 성경 본문은 명조로. 가로획이 가늘고 세로획이 굵어 줄을 따라가기 쉽고,
    // 성경은 원래 명조로 조판해 온 글이라 눈에 익다.
    // 크기·줄간격은 사용자가 조절하므로 여기서는 서체만 정한다.
    
  },
  verseRow: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.one,
    // 꾹 누르는 것이 이제 유일한 조작이라, 누르는 동안 브라우저가 글자를
    // 잡아 버리면(모바일 웹의 텍스트 선택) 동작이 서로 부딪힌다. 본문 복사는
    // 열린 창에서 할 수 있게 두고, 읽는 화면에서는 선택을 끈다.
    userSelect: 'none',
  },
  verseRowHolding: {
    opacity: 0.55,
  },
  verseNumOnHighlight: {
    color: '#333333',
  },
  textOnHighlight: {
    color: '#1a1a1a',
  },
  hintWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  hintRow: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  hintText: {
    textAlign: 'center',
  },
  pagerRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  pagerButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  bookmarkButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
