import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getRandomVerse, getVerseOfDay, type Book, type Verse, getBooks } from '@/db/bible';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [isToday, setIsToday] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      const [v, loadedBooks] = await Promise.all([getVerseOfDay(db, 'ko_ko'), getBooks(db)]);
      setBooks(loadedBooks);
      setVerse(v);
      setBook(loadedBooks.find((b) => b.id === v?.book_id) ?? null);
    })();
  }, [db]);

  async function refreshVerse() {
    setRefreshing(true);
    try {
      const v = await getRandomVerse(db, 'ko_ko');
      setVerse(v);
      setBook(books.find((b) => b.id === v?.book_id) ?? null);
      setIsToday(false);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          말씀과 함께
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.verseCard}>
          <View style={styles.verseCardHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              {isToday ? '오늘의 말씀' : '말씀 한 구절'}
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
          {verse && (
            <>
              <ThemedText style={styles.verseText}>{verse.text}</ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {book?.name_ko} {verse.chapter}:{verse.verse}
              </ThemedText>
            </>
          )}
        </ThemedView>

        <Pressable
          onPress={() =>
            verse &&
            router.push({
              pathname: '/read',
              params: { bookId: String(verse.book_id), chapter: String(verse.chapter) },
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
  verseText: {
    fontSize: 20,
    lineHeight: 30,
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
