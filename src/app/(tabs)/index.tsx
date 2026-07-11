import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getRandomPassage, getPassageOfDay, type Book, type Verse, getBooks } from '@/db/bible';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [passage, setPassage] = useState<Verse[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [isToday, setIsToday] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, loadedBooks] = await Promise.all([getPassageOfDay(db, 'ko_ko'), getBooks(db)]);
      setBooks(loadedBooks);
      setPassage(p);
      setBook(loadedBooks.find((b) => b.id === p[0]?.book_id) ?? null);
    })();
  }, [db]);

  async function refreshVerse() {
    setRefreshing(true);
    try {
      const p = await getRandomPassage(db, 'ko_ko');
      setPassage(p);
      setBook(books.find((b) => b.id === p[0]?.book_id) ?? null);
      setIsToday(false);
    } finally {
      setRefreshing(false);
    }
  }

  const firstVerse = passage[0];
  const lastVerse = passage[passage.length - 1];
  const reference =
    firstVerse && lastVerse
      ? firstVerse.verse === lastVerse.verse
        ? `${book?.name_ko} ${firstVerse.chapter}:${firstVerse.verse}`
        : `${book?.name_ko} ${firstVerse.chapter}:${firstVerse.verse}-${lastVerse.verse}`
      : '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          말씀과 함께
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.verseCard}>
          <View style={styles.verseCardHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              {isToday ? '오늘의 말씀' : '말씀 묵상'}
            </ThemedText>
            <Pressable
              onPress={refreshVerse}
              disabled={refreshing}
              hitSlop={10}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                🔄 다른 말씀
              </ThemedText>
            </Pressable>
          </View>
          {passage.length > 0 && (
            <>
              <View style={styles.passageText}>
                {passage.map((v) => (
                  <ThemedText key={v.id} style={styles.verseText}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {v.verse}{' '}
                    </ThemedText>
                    {v.text}
                  </ThemedText>
                ))}
              </View>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {reference}
              </ThemedText>
            </>
          )}
        </ThemedView>

        <Pressable
          onPress={() =>
            firstVerse &&
            router.push({
              pathname: '/read',
              params: { bookId: String(firstVerse.book_id), chapter: String(firstVerse.chapter) },
            })
          }
          style={({ pressed }) => [
            styles.readButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">이 본문 읽으러 가기</ThemedText>
        </Pressable>

        <Pressable
          onPress={() => router.push('/plans')}
          style={({ pressed }) => [pressed && styles.pressed]}>
          <ThemedText type="link" themeColor="textSecondary">
            읽기 계획 보기
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  verseCard: {
    width: '100%',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  verseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passageText: {
    gap: Spacing.one,
  },
  verseText: {
    fontSize: 17,
    lineHeight: 26,
  },
  readButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
