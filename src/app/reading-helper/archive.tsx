import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getAllRecordDates, getStartDate } from '@/lib/readingHelper/db';
import { buildFullPlan, formatChapterRange, todayDateString, type PlanDay } from '@/lib/readingHelper/readingPlan';
import { mergeWithBlogChapters } from '@/lib/readingHelper/blogContent';

export default function ReadingHelperArchiveScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [pastDays, setPastDays] = useState<PlanDay[]>([]);
  const [recordDates, setRecordDates] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!userId) return;
        const startDate = await getStartDate(userId);
        if (!startDate) {
          router.replace('/reading-helper/onboarding');
          return;
        }
        const today = todayDateString();
        const algoPlan = buildFullPlan(startDate).filter((d) => d.date <= today);
        const [dates, plan] = await Promise.all([getAllRecordDates(userId), mergeWithBlogChapters(algoPlan)]);
        if (cancelled) return;
        setPastDays(plan.reverse());
        setRecordDates(dates);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  if (loading) {
    return (
      <ThemedView style={styles.centeredScreen}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="subtitle" style={styles.title}>
          전체 아카이브
        </ThemedText>
        <FlatList
          style={styles.list}
          data={pastDays}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              아직 지나온 통독 기록이 없습니다.
            </ThemedText>
          }
          renderItem={({ item }) => {
            const hasRecord = recordDates.has(item.date);
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/day-detail', params: { date: item.date } })}
                style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <View>
                  <ThemedText type="smallBold">Day {item.dayNumber}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.rowRange}>
                    {formatChapterRange(item.chapters)} · {item.date}
                  </ThemedText>
                </View>
                {hasRecord && <ThemedText style={{ color: theme.backgroundSelected }}>✓</ThemedText>}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centeredScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  safeArea: { flex: 1 },
  title: { fontSize: 20, paddingHorizontal: Spacing.five, paddingTop: Spacing.five },
  list: { flex: 1 },
  listContent: { padding: Spacing.five, gap: Spacing.two, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  emptyText: { textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Spacing.four, paddingVertical: Spacing.three, paddingHorizontal: Spacing.four },
  rowRange: { marginTop: 2 },
  pressed: { opacity: 0.7 },
});
