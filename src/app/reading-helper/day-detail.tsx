import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getDayRecord, getStartDate, type DayRecord } from '@/lib/readingHelper/db';
import { buildFullPlan, daysBetweenInclusive, formatChapterRange, type PlanDay } from '@/lib/readingHelper/readingPlan';

import { getDayContentForDay } from '@/lib/readingHelper/dayContent';

export default function ReadingHelperDayDetailScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { date } = useLocalSearchParams<{ date: string }>();

  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<PlanDay | null>(null);
  const [record, setRecord] = useState<DayRecord | null>(null);
  const [hasContent, setHasContent] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!date || !userId) return;
        const startDate = await getStartDate(userId);
        if (!startDate) {
          router.replace('/reading-helper/onboarding');
          return;
        }
        const dayNumber = daysBetweenInclusive(startDate, date);

        const [plan, dayRecord] = await Promise.all([
          Promise.resolve(buildFullPlan(startDate)),
          getDayRecord(userId, date),
        ]);
        const dayEntry = dayNumber >= 1 ? (plan[dayNumber - 1] ?? null) : null;
        const content = dayEntry ? await getDayContentForDay(startDate, dayEntry.dayNumber) : null;
        if (cancelled) return;
        setDay(dayEntry);
        setRecord(dayRecord);
        setHasContent(content !== null);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [date, userId])
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">◀ 돌아가기</ThemedText>
          </Pressable>

          <ThemedText type="subtitle" style={styles.title}>
            {day ? `Day ${day.dayNumber}` : date} {day ? `| ${formatChapterRange(day.chapters)}` : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {date}
          </ThemedText>

          <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">읽기 완료</ThemedText>
            <ThemedText type="small">{record?.reading_complete ? '✓ 완료' : '미완료'}</ThemedText>
          </View>

          <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">성경퀴즈</ThemedText>
            <ThemedText type="small">{record?.quiz_score != null ? `${record.quiz_score}점` : '응시 안함'}</ThemedText>
          </View>

          <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">암송 퍼즐</ThemedText>
            <ThemedText type="small">
              {record?.memorization_success != null
                ? record.memorization_success
                  ? `✓ 성공 (${record.memorization_attempts}회 시도)`
                  : '실패'
                : '시도 안함'}
            </ThemedText>
          </View>

          {hasContent && date && (
            <Pressable
              onPress={() => router.push({ pathname: '/reading-helper/day-content', params: { date } })}
              style={({ pressed }) => [styles.reviewButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.reviewButtonText}>
                📖 처음부터 다시 보기
              </ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centeredScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.five, gap: Spacing.three, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  backRow: { alignSelf: 'flex-start' },
  title: { fontSize: 20, marginTop: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  reviewButton: { borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center', marginTop: 4 },
  reviewButtonText: { color: '#fff' },
  pressed: { opacity: 0.85 },
});
