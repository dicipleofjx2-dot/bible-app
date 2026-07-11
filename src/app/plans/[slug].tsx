import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getBooks, type Book } from '@/db/bible';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getCompletedDays,
  getPlanBySlug,
  setDayComplete,
  setDayIncomplete,
  type ReadingPlan,
  type ReadingPlanDay,
} from '@/db/plans';

export default function PlanDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const { session } = useAuth();

  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [days, setDays] = useState<ReadingPlanDay[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!slug) return;
    const [result, bookList] = await Promise.all([getPlanBySlug(slug), getBooks(db)]);
    setBooks(bookList);
    if (!result) return;
    setPlan(result.plan);
    setDays(result.days);
    if (session) {
      setCompleted(await getCompletedDays(result.plan.id));
    }
  }, [slug, db, session]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleDay(day: ReadingPlanDay) {
    if (!session || !plan) return;
    if (completed.has(day.day_number)) {
      await setDayIncomplete(plan.id, day.day_number);
    } else {
      await setDayComplete(plan.id, day.day_number, session.user.id);
    }
    setCompleted(await getCompletedDays(plan.id));
  }

  const bookName = (bookId: number) => books.find((b) => b.id === bookId)?.name_ko ?? '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {plan && (
          <View style={styles.header}>
            <ThemedText type="subtitle">{plan.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {completed.size} / {days.length}일 완료
            </ThemedText>
            {!session && (
              <ThemedText type="small" themeColor="textSecondary">
                진행 상황을 저장하려면 커뮤니티 탭에서 로그인해주세요.
              </ThemedText>
            )}
          </View>
        )}

        <FlatList
          data={days}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const done = completed.has(item.day_number);
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/read',
                    params: { bookId: String(item.book_id), chapter: String(item.chapter) },
                  })
                }
                style={[styles.dayRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.dayInfo}>
                  <ThemedText type="smallBold">{item.day_number}일차</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {bookName(item.book_id)} {item.chapter}장
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => toggleDay(item)}
                  disabled={!session}
                  style={[
                    styles.checkbox,
                    { borderColor: theme.textSecondary },
                    done && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  {done && <ThemedText type="small">✓</ThemedText>}
                </Pressable>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.one,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  dayInfo: {
    gap: Spacing.half,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
