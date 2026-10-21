import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';
import { VOCAB_BOOKS } from '@/lib/vocab/books';
import type { VocabWord } from '@/lib/vocab/types';
import { canSpeak, say, speak, stopSpeaking, useVocabProgress, type VocabMark, type VocabProgress } from '@/lib/vocab/progress';

/**
 * 영어 성경단어장 — 데이빗에듀 안의 화면. 복음서·여호수아(NIV).
 *
 * NIV 본문은 저작권이 있어 문장을 옮기지 않았다. 단어·뜻·나오는 절 번호와 직접 쓴
 * 예문뿐이다. 책을 늘릴 때는 `src/lib/vocab/` 에 데이터를 만들고 `books.ts` 에 한 줄 붙인다.
 */

type Filter = 'all' | 'unchecked' | 'learn' | 'known';
const FILTERS: [Filter, string][] = [
  ['all', '전체'],
  ['unchecked', '미체크'],
  ['learn', '더 학습'],
  ['known', '알아요'],
];

type SetMark = (id: string, m: VocabMark | undefined) => void;

export default function BibleVocabScreen() {
  const theme = useTheme();
  const { progress, setMark } = useVocabProgress();
  const [tab, setTab] = useState<'list' | 'study'>('list');
  const [bookId, setBookId] = useState(VOCAB_BOOKS[0].id);
  const [chapter, setChapter] = useState<number | 'all'>('all');
  const book = VOCAB_BOOKS.find((b) => b.id === bookId) ?? VOCAB_BOOKS[0];

  const words = useMemo(
    () => book.words.filter((w) => chapter === 'all' || w.chapter === chapter),
    [book, chapter],
  );
  const { known, learn } = useMemo(() => {
    let k = 0;
    let l = 0;
    for (const w of words) {
      if (progress[w.id] === 'known') k++;
      else if (progress[w.id] === 'learn') l++;
    }
    return { known: k, learn: l };
  }, [words, progress]);
  const pct = words.length ? Math.round((known / words.length) * 100) : 0;

  const header = (
    <VocabHeader
      bookId={bookId}
      setBookId={(id) => {
        setBookId(id);
        setChapter('all');
      }}
      chapters={book.chapters}
      chapter={chapter}
      setChapter={setChapter}
      bookName={book.name}
      total={words.length}
      known={known}
      learn={learn}
      pct={pct}
    />
  );

  // 고정되는 것은 탭 한 줄뿐이다. 진도·책·장 고르기는 내용과 함께 스크롤된다 —
  // 위쪽이 화면을 다 차지하면 단어를 볼 자리가 모자란다.
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.frame}>
          <View style={styles.top}>
            <View style={[styles.tabs, { backgroundColor: theme.accentSoft }]}>
              {(
                [
                  ['list', '단어 목록'],
                  ['study', '단어 학습'],
                ] as const
              ).map(([k, label]) => (
                <Pressable
                  key={k}
                  onPress={() => setTab(k)}
                  style={[styles.tab, tab === k && { backgroundColor: theme.accent }]}>
                  <ThemedText style={[Type.itemDescription, { fontWeight: '700', color: tab === k ? '#FFFFFF' : theme.textSecondary }]}>
                    {label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {tab === 'list' ? (
            <WordList header={header} words={words} bookName={book.name} progress={progress} setMark={setMark} />
          ) : (
            <Study header={header} words={words} bookName={book.name} progress={progress} setMark={setMark} />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * 진도 한 줄 + 책·장 고르기. 평소에는 접혀 있어 한 줄만 차지하고, 눌러야 펼쳐진다.
 */
function VocabHeader({
  bookId,
  setBookId,
  chapters,
  chapter,
  setChapter,
  bookName,
  total,
  known,
  learn,
  pct,
}: {
  bookId: string;
  setBookId: (id: string) => void;
  chapters: number[];
  chapter: number | 'all';
  setChapter: (c: number | 'all') => void;
  bookName: string;
  total: number;
  known: number;
  learn: number;
  pct: number;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[styles.summary, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.summaryText}>
          <ThemedText style={Type.itemTitle}>
            {bookName} · {chapter === 'all' ? '전체' : `${chapter}장`}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {pct}% · 알아요 {known} · 더 학습 {learn} · 미체크 {total - known - learn}
          </ThemedText>
        </View>
        <ThemedText style={{ color: theme.accent, fontWeight: '700' }}>{open ? '닫기 ▴' : '책·장 바꾸기 ▾'}</ThemedText>
      </Pressable>
      <View style={[styles.bar, { backgroundColor: theme.accentSoft }]}>
        <View style={[styles.barFill, { backgroundColor: theme.done, width: `${pct}%` }]} />
      </View>
      {open ? (
        <View style={styles.pickers}>
          <View style={styles.books}>
            {VOCAB_BOOKS.map((b) => (
              <Chip key={b.id} label={`${b.name} ${b.words.length}`} on={bookId === b.id} onPress={() => setBookId(b.id)} />
            ))}
          </View>
          <View style={styles.books}>
            {(['all', ...chapters] as (number | 'all')[]).map((c) => (
              <Chip key={c} label={c === 'all' ? '전체' : `${c}장`} on={chapter === c} onPress={() => setChapter(c)} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: on ? theme.accent : theme.backgroundElement, borderColor: on ? theme.accent : theme.border },
      ]}>
      <ThemedText style={[Type.itemDescription, { color: on ? '#FFFFFF' : theme.textSecondary, fontWeight: '600' }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SpeakButton({ text, label }: { text: string; label: string }) {
  const theme = useTheme();
  if (!canSpeak()) return null;
  return (
    <Pressable
      onPress={() => speak(text)}
      style={[styles.speak, { backgroundColor: theme.accentSoft }]}
      accessibilityLabel={label}>
      <ThemedText style={[Type.itemDescription, { color: theme.accent, fontWeight: '600' }]}>🔊 {label}</ThemedText>
    </Pressable>
  );
}

function MarkButtons({ id, mark, setMark, compact }: { id: string; mark?: VocabMark; setMark: SetMark; compact?: boolean }) {
  const theme = useTheme();
  return (
    <View style={compact ? styles.markCol : styles.markRow}>
      <Pressable
        onPress={() => setMark(id, mark === 'known' ? undefined : 'known')}
        style={[styles.markBtn, { backgroundColor: mark === 'known' ? theme.done : theme.accentSoft }]}>
        <ThemedText style={[Type.itemDescription, { fontWeight: '700', color: mark === 'known' ? '#40302A' : theme.textSecondary }]}>
          ✓ 알아요
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => setMark(id, mark === 'learn' ? undefined : 'learn')}
        style={[styles.markBtn, { backgroundColor: mark === 'learn' ? theme.accent : theme.accentSoft }]}>
        <ThemedText style={[Type.itemDescription, { fontWeight: '700', color: mark === 'learn' ? '#FFFFFF' : theme.textSecondary }]}>
          ✎ 더 학습
        </ThemedText>
      </Pressable>
    </View>
  );
}

function WordList({ header, words, bookName, progress, setMark }: { header: ReactNode; words: VocabWord[]; bookName: string; progress: VocabProgress; setMark: SetMark }) {
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  // 예문은 눌러야 펼쳐진다 — 목록은 단어와 뜻만 보여야 차례대로 훑으며 체크하기 쉽다.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const shown = words.filter((w) => {
    const m = progress[w.id];
    return filter === 'all' || (filter === 'unchecked' ? !m : m === filter);
  });

  return (
    <FlatList
      data={shown}
      keyExtractor={(w) => w.id}
      contentContainerStyle={styles.list}
      initialNumToRender={12}
      ListHeaderComponent={
        <>
          {header}
          <View style={styles.filters}>
            {FILTERS.map(([k, label]) => (
              <Chip key={k} label={label} on={filter === k} onPress={() => setFilter(k)} />
            ))}
          </View>
        </>
      }
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          해당하는 단어가 없어요.
        </ThemedText>
      }
      renderItem={({ item: w }) => {
        const m = progress[w.id];
        return (
          <ThemedView
            type="backgroundElement"
            style={[
              styles.wordCard,
              { borderColor: m === 'known' ? theme.done : m === 'learn' ? theme.accent : theme.border },
            ]}>
            <View style={styles.wordHead}>
              <Pressable onPress={() => speak(w.word)} style={styles.wordMain}>
                <ThemedText style={styles.word}>{w.word}</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {w.pos} · {bookName} {w.chapter}:{w.verse}
                </ThemedText>
              </Pressable>
              <MarkButtons id={w.id} mark={m} setMark={setMark} compact />
            </View>
            <ThemedText style={[Type.itemTitle, { color: theme.accent }]}>{w.ko}</ThemedText>
            <Pressable onPress={() => setOpen((o) => ({ ...o, [w.id]: !o[w.id] }))} hitSlop={8}>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                예문 {open[w.id] ? '접기 ▴' : '보기 ▾'}
              </ThemedText>
            </Pressable>
            {open[w.id] ? (
              <Pressable onPress={() => speak(w.example)} style={[styles.example, { backgroundColor: theme.accentSoft }]}>
                <ThemedText style={Type.itemDescription}>
                  {canSpeak() ? '🔊 ' : ''}
                  {w.example}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {w.exampleKo}
                </ThemedText>
              </Pressable>
            ) : null}
          </ThemedView>
        );
      }}
    />
  );
}

function Study({ header, words, bookName, progress, setMark }: { header: ReactNode; words: VocabWord[]; bookName: string; progress: VocabProgress; setMark: SetMark }) {
  const theme = useTheme();
  const [scope, setScope] = useState<'unknown' | 'learn'>('unknown');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);

  // 「알아요」로 체크한 단어는 덱에서 빠진다.
  const deck = words.filter((w) => (scope === 'learn' ? progress[w.id] === 'learn' : progress[w.id] !== 'known'));
  const pos = Math.min(index, deck.length - 1);
  const card = deck[pos];
  const front = reverse ? flipped : !flipped;

  // 순서대로 쭉 읽어 주기. 지금 카드부터 덱 끝까지 한 단어씩 읽고, 읽는 카드가 화면에 뜬다.
  // token 은 「멈춤」을 알리는 표시다 — 값이 바뀌면 돌고 있던 반복이 그 자리에서 끝난다.
  const [playing, setPlaying] = useState(false);
  const [withMeaning, setWithMeaning] = useState(true);
  const [withExample, setWithExample] = useState(false);
  const token = useRef(0);

  function stop() {
    token.current++;
    stopSpeaking();
    setPlaying(false);
  }

  async function playAll() {
    if (!deck.length) return;
    const my = ++token.current;
    const list = deck;
    setPlaying(true);
    setFlipped(false);
    for (let i = pos; i < list.length; i++) {
      if (token.current !== my) return;
      setIndex(i);
      const w = list[i];
      await say(w.word, 'en-US');
      if (token.current !== my) return;
      if (withMeaning) await say(w.ko, 'ko-KR', 1);
      if (token.current !== my) return;
      if (withExample) await say(w.example, 'en-US');
      await new Promise((r) => setTimeout(r, 400));
    }
    if (token.current === my) setPlaying(false);
  }

  // 화면을 떠나거나 책·장이 바뀌면 소리도 멈춘다.
  useEffect(() => {
    return () => {
      token.current++;
      stopSpeaking();
    };
  }, [words]);

  function answer(m: VocabMark) {
    if (!card) return;
    if (playing) stop();
    setMark(card.id, m);
    setFlipped(false);
    // known 이면 덱에서 빠지므로 같은 자리가 곧 다음 카드. learn 이면 한 칸 간다.
    if (m === 'learn' || scope === 'learn') setIndex((i) => (i + 1 >= deck.length ? 0 : i + 1));
    else setIndex((i) => (i >= deck.length - 1 ? 0 : i));
  }

  function move(d: number) {
    if (playing) stop();
    setFlipped(false);
    setIndex((i) => (deck.length ? (i + d + deck.length) % deck.length : 0));
  }

  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {header}
      <View style={styles.filters}>
        <Chip label="모르는 단어 전부" on={scope === 'unknown'} onPress={() => { stop(); setScope('unknown'); setIndex(0); setFlipped(false); }} />
        <Chip label="더 학습만" on={scope === 'learn'} onPress={() => { stop(); setScope('learn'); setIndex(0); setFlipped(false); }} />
        <Chip label="뜻 → 영어" on={reverse} onPress={() => { setReverse((r) => !r); setFlipped(false); }} />
      </View>

      {canSpeak() && card ? (
        <View style={styles.player}>
          <Pressable
            onPress={playing ? stop : playAll}
            style={[styles.playBtn, { backgroundColor: playing ? theme.textSecondary : theme.accent }]}>
            <ThemedText style={[Type.itemTitle, { color: '#FFFFFF' }]}>
              {playing ? '■ 멈춤' : `▶ 순서대로 듣기 (${deck.length - pos}개)`}
            </ThemedText>
          </Pressable>
          <Chip label="뜻 읽기" on={withMeaning} onPress={() => setWithMeaning((v) => !v)} />
          <Chip label="예문 읽기" on={withExample} onPress={() => setWithExample((v) => !v)} />
        </View>
      ) : null}

      {!card ? (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          {scope === 'learn' ? '‘더 학습’으로 체크한 단어가 없어요.' : '모든 단어를 알고 있어요! 🎉'}
        </ThemedText>
      ) : (
        <>
          <ThemedText themeColor="textSecondary" style={[Type.caption, styles.counter]}>
            {pos + 1} / {deck.length}
          </ThemedText>

          <Pressable
            onPress={() => setFlipped((f) => !f)}
            style={[
              styles.flash,
              { backgroundColor: front ? theme.backgroundElement : theme.accentSoft, borderColor: theme.border },
            ]}>
            {front ? (
              <>
                <ThemedText style={styles.flashWord}>{card.word}</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {card.pos}
                </ThemedText>
                <ThemedText style={[Type.body, styles.flashExample]}>{card.example}</ThemedText>
                <View style={styles.speakRow}>
                  <SpeakButton text={card.word} label="단어" />
                  <SpeakButton text={card.example} label="문장" />
                </View>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  눌러서 뜻 보기
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={[styles.flashKo, { color: theme.accent }]}>{card.ko}</ThemedText>
                <ThemedText style={[Type.body, styles.flashExample]}>{card.example}</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                  {card.exampleKo}
                </ThemedText>
                <View style={styles.speakRow}>
                  <SpeakButton text={card.word} label="단어" />
                  <SpeakButton text={card.example} label="문장" />
                </View>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {bookName} {card.chapter}:{card.verse}
                </ThemedText>
              </>
            )}
          </Pressable>

          <View style={styles.answerRow}>
            <Pressable onPress={() => answer('learn')} style={[styles.answer, { backgroundColor: theme.accent }]}>
              <ThemedText style={[Type.itemTitle, { color: '#FFFFFF' }]}>✎ 더 학습할래요</ThemedText>
            </Pressable>
            <Pressable onPress={() => answer('known')} style={[styles.answer, { backgroundColor: theme.done }]}>
              <ThemedText style={[Type.itemTitle, { color: '#40302A' }]}>✓ 알아요</ThemedText>
            </Pressable>
          </View>
          <View style={styles.navRow}>
            <Pressable onPress={() => move(-1)} style={styles.navBtn}>
              <ThemedText themeColor="textSecondary">← 이전</ThemedText>
            </Pressable>
            <Pressable onPress={() => move(1)} style={styles.navBtn}>
              <ThemedText themeColor="textSecondary">다음 →</ThemedText>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  frame: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  top: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  header: { gap: Spacing.two },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, borderWidth: 1, borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  summaryText: { flex: 1 },
  player: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  playBtn: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  pickers: { gap: Spacing.two, paddingTop: Spacing.one },
  card: { borderRadius: 20, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three },
  pct: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  books: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chips: { gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999, borderWidth: 1 },
  tabs: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: 999 },
  list: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: BottomTabInset + Spacing.five, gap: Spacing.three },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.one },
  empty: { textAlign: 'center', paddingVertical: Spacing.six },
  wordCard: { borderRadius: 20, borderWidth: 1.5, padding: Spacing.three, gap: Spacing.two },
  wordHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  wordMain: { flex: 1 },
  word: { fontSize: 22, lineHeight: 30, fontWeight: '800' },
  example: { borderRadius: 14, padding: Spacing.two + 2, gap: 2 },
  markRow: { flexDirection: 'row', gap: Spacing.two },
  markCol: { gap: 6 },
  markBtn: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 6, alignItems: 'center' },
  speak: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  speakRow: { flexDirection: 'row', gap: Spacing.two },
  counter: { textAlign: 'center' },
  flash: {
    minHeight: 320,
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  flashWord: { fontSize: 40, lineHeight: 48, fontWeight: '800', textAlign: 'center' },
  flashKo: { fontSize: 28, lineHeight: 36, fontWeight: '800', textAlign: 'center' },
  flashExample: { textAlign: 'center' },
  answerRow: { flexDirection: 'row', gap: Spacing.three },
  answer: { flex: 1, borderRadius: 18, paddingVertical: Spacing.three, alignItems: 'center' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between' },
  navBtn: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
});
