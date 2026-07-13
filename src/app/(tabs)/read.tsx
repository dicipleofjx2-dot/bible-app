import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getBooks,
  getChapterCount,
  getChapterVerses,
  TRANSLATIONS,
  type Book,
  type Translation,
  type Verse,
} from '@/db/bible';
import { BookChapterPicker } from '@/features/bible/BookChapterPicker';
import { VerseActionSheet } from '@/features/notes/VerseActionSheet';
import {
  deleteMark,
  getMarksForChapter,
  upsertMark,
  COMMENTARY_HIGHLIGHT_COLORS,
  HIGHLIGHT_COLORS,
  type VerseMark,
} from '@/db/userData';
import { getPlanDaysForChapter, setDayComplete, type PlanDayMatch } from '@/db/plans';
import { getRoomsForPlan, postRoomActivity } from '@/db/rooms';

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 28;

export default function ReadScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ bookId?: string; chapter?: string }>();

  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState(1);
  const [chapterCount, setChapterCount] = useState(1);
  const [translation, setTranslation] = useState<Translation>('ko_ko');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [marks, setMarks] = useState<VerseMark[]>([]);
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const [planMatches, setPlanMatches] = useState<PlanDayMatch[]>([]);

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
    } else if (bookId == null && books.length > 0) {
      setBookId(books[0].id);
      setChapter(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.bookId, params.chapter, books]);

  useEffect(() => {
    if (bookId == null) return;
    getChapterCount(db, bookId).then(setChapterCount);
  }, [db, bookId]);

  useEffect(() => {
    if (bookId == null) return;
    getChapterVerses(db, bookId, chapter, translation).then(setVerses);
    refreshMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, bookId, chapter, translation]);

  // If this chapter is a day in a reading plan, mark that day complete —
  // reading the chapter is what should count as "done", not a separate tap.
  useEffect(() => {
    if (bookId == null || !isSupabaseConfigured) {
      setPlanMatches([]);
      return;
    }
    getPlanDaysForChapter(bookId, chapter)
      .then((matches) => {
        setPlanMatches(matches);
        if (session) {
          for (const m of matches) {
            setDayComplete(m.planId, m.dayNumber, session.user.id)
              .then(() => getRoomsForPlan(session.user.id, m.planId))
              .then((rooms) => {
                for (const room of rooms) {
                  postRoomActivity(room.id, session.user.id, m.dayNumber, bookId, chapter).catch(() => {});
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => setPlanMatches([]));
  }, [bookId, chapter, session]);

  const currentBook = books.find((b) => b.id === bookId);
  const highlightHex = (color: string | null) =>
    [...HIGHLIGHT_COLORS, ...COMMENTARY_HIGHLIGHT_COLORS].find((c) => c.code === color)?.hex ?? null;

  function goToChapter(delta: number) {
    const next = chapter + delta;
    if (next < 1 || next > chapterCount) return;
    setChapter(next);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.toolbar}>
          <Pressable
            onPress={() => setPickerVisible(true)}
            style={[styles.bookButton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">
              {currentBook ? `${currentBook.name_ko} ${chapter}장` : '선택'}
            </ThemedText>
          </Pressable>

          <View style={styles.toolbarRight}>
            <Pressable
              onPress={() => router.push('/plans')}
              style={[styles.planButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">📅 읽기계획</ThemedText>
            </Pressable>
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

        {planMatches.length > 0 && (
          <View style={styles.planBanner}>
            {planMatches.map((m) => (
              <ThemedText key={m.planId} type="small" themeColor="textSecondary">
                {session
                  ? `✓ '${m.planTitle}' ${m.dayNumber}일차 완료로 표시됨`
                  : `'${m.planTitle}' ${m.dayNumber}일차예요 · 로그인하면 진행 상황이 저장돼요`}
              </ThemedText>
            ))}
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}>
          <View style={styles.textColumn}>
            {verses.map((v) => {
              const mark = marks.find((m) => m.verse === v.verse);
              const bg = highlightHex(mark?.color ?? null);
              return (
                <View key={v.id} style={[styles.verseRow, bg ? { backgroundColor: bg } : null]}>
                  <Pressable
                    onLongPress={() => setActiveVerse(v)}
                    delayLongPress={350}
                    style={styles.verseTextPressable}>
                    <ThemedText style={[styles.verseText, { fontSize, lineHeight: fontSize * 1.6 }]}>
                      <ThemedText
                        themeColor={bg ? undefined : 'textSecondary'}
                        style={[{ fontSize: fontSize * 0.6 }, bg ? styles.verseNumOnHighlight : null]}>
                        {v.verse}{' '}
                      </ThemedText>
                      <ThemedText style={bg ? styles.textOnHighlight : undefined}>{v.text}</ThemedText>
                    </ThemedText>
                  </Pressable>
                  <View style={styles.verseActions}>
                    {mark?.note ? <ThemedText style={styles.noteDot}>📝</ThemedText> : null}
                    <Pressable
                      onPress={() => setActiveVerse(v)}
                      hitSlop={10}
                      style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}>
                      <ThemedText
                        themeColor={bg ? undefined : 'textSecondary'}
                        style={bg ? styles.verseNumOnHighlight : undefined}>
                        ✎
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
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
          setBookId(selectedBookId);
          setChapter(selectedChapter);
        }}
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
  planButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  planBanner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
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
    fontWeight: '400',
  },
  verseRow: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.one,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  verseTextPressable: {
    flex: 1,
  },
  verseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  editButton: {
    padding: Spacing.one,
  },
  editButtonPressed: {
    opacity: 0.5,
  },
  verseNumOnHighlight: {
    color: '#333333',
  },
  textOnHighlight: {
    color: '#1a1a1a',
  },
  noteDot: {
    fontSize: 12,
    marginLeft: Spacing.one,
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
});
