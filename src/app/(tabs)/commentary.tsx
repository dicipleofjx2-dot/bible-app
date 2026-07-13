import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentaryText } from '@/components/commentary-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getBooks, getChapterVerses, type Book, type Verse } from '@/db/bible';
import {
  getCommentaryForVerse,
  getCommentarySources,
  getCommentaryVersesForChapter,
  type CommentaryEntry,
} from '@/db/commentary';
import { BookChapterPicker } from '@/features/bible/BookChapterPicker';
import { COMMENTARY_HIGHLIGHT_COLORS, upsertMark, type HighlightColor } from '@/db/userData';

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export default function CommentaryScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();

  const [books, setBooks] = useState<Book[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [source, setSource] = useState<string>('');
  const [bookId, setBookId] = useState(1);
  const [chapter, setChapter] = useState(1);
  const [verse, setVerse] = useState(1);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [annotatedVerses, setAnnotatedVerses] = useState<number[]>([]);
  const [commentary, setCommentary] = useState<CommentaryEntry | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [savedColor, setSavedColor] = useState<HighlightColor | null>(null);

  useEffect(() => {
    getBooks(db).then(setBooks);
    getCommentarySources(db).then((list) => {
      setSources(list);
      setSource((prev) => prev || list[0] || '');
    });
  }, [db]);

  useEffect(() => {
    getChapterVerses(db, bookId, chapter, 'ko_ko').then(setChapterVerses);
    if (source) getCommentaryVersesForChapter(db, bookId, chapter, source).then(setAnnotatedVerses);
  }, [db, bookId, chapter, source]);

  useEffect(() => {
    if (!source) return;
    setSavedColor(null);
    getCommentaryForVerse(db, bookId, chapter, verse, source).then(setCommentary);
  }, [db, bookId, chapter, verse, source]);

  const book = books.find((b) => b.id === bookId);
  const currentVerseText = chapterVerses.find((v) => v.verse === verse)?.text ?? '';

  async function saveHighlight(color: HighlightColor) {
    const nextColor = savedColor === color ? null : color;
    setSavedColor(nextColor);
    const note =
      nextColor && commentary
        ? `${currentVerseText}\n\n[${commentary.source} 주석]\n${stripHtml(commentary.html)}`
        : nextColor
          ? currentVerseText
          : null;
    await upsertMark({
      bookId,
      chapter,
      verse,
      translation: 'ko_ko',
      color: nextColor,
      note,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">주석</ThemedText>
          {sources.length > 1 && (
            <View style={styles.sourceRow}>
              {sources.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSource(s)}
                  style={[
                    styles.sourceChip,
                    { backgroundColor: s === source ? theme.backgroundSelected : theme.backgroundElement },
                  ]}>
                  <ThemedText type="small">{s}</ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={() => setPickerVisible(true)}
          style={[styles.verseSelector, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">
            {book?.name_ko} {chapter}장 {verse}절
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            책/장 바꾸기
          </ThemedText>
        </Pressable>

        {chapterVerses.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.verseRow}>
            {chapterVerses.map((v) => {
              const hasCommentary = annotatedVerses.includes(v.verse);
              const selected = v.verse === verse;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setVerse(v.verse)}
                  style={[
                    styles.verseChip,
                    {
                      backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                      opacity: hasCommentary || selected ? 1 : 0.4,
                    },
                  ]}>
                  <ThemedText type="small">{v.verse}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {currentVerseText ? (
            <ThemedText type="small" style={styles.verseText}>
              {verse}. {currentVerseText}
            </ThemedText>
          ) : null}

          {commentary ? (
            <CommentaryText html={commentary.html} />
          ) : (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              이 구절에 대한 주석이 없습니다.
            </ThemedText>
          )}
        </ScrollView>

        <View style={styles.highlightBar}>
          <ThemedText type="small" themeColor="textSecondary">
            구절+주석 하이라이트
          </ThemedText>
          <View style={styles.colorRow}>
            {COMMENTARY_HIGHLIGHT_COLORS.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => saveHighlight(c.code)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c.hex },
                  savedColor === c.code && [styles.colorSwatchSelected, { borderColor: theme.text }],
                ]}
              />
            ))}
          </View>
        </View>
      </ThemedView>

      <BookChapterPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        books={books}
        onSelect={(newBookId, newChapter) => {
          setBookId(newBookId);
          setChapter(newChapter);
          setVerse(1);
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
    width: '100%',
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sourceChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  verseSelector: {
    width: '100%',
    maxWidth: MaxContentWidth,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verseRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    flexGrow: 0,
  },
  verseChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  body: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  highlightBar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderWidth: 3,
  },
});
