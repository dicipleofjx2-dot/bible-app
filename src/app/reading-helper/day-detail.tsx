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
import {
  buildFullPlan,
  daysBetweenInclusive,
  formatChapterRange,
  isPreviewDate,
  type PlanDay,
} from '@/lib/readingHelper/readingPlan';

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

  const isPreview = !!date && isPreviewDate(date);

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

          {isPreview ? (
            // 아직 오지 않은 날 — 기록 자리를 보여줄 것이 없다. 대신 무엇을 할 수
            // 있는지와, 여기서 한 것은 기록에 남지 않는다는 점을 먼저 알린다.
            <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">미리 보는 날입니다</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                본문과 해설을 미리 읽고 퀴즈·암송을 연습해 보실 수 있어요. 여기서 한 것은 기록과
                포인트에 반영되지 않으니, 그날이 되면 다시 하시면 됩니다.
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">읽기 완료</ThemedText>
                <ThemedText type="small">{record?.reading_complete ? '✓ 완료' : '미완료'}</ThemedText>
              </View>

              <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">성경퀴즈</ThemedText>
                <ThemedText type="small">
                  {record?.quiz_score != null ? `${record.quiz_score}점` : '응시 안함'}
                </ThemedText>
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
            </>
          )}

          {hasContent && date && (
            <>
              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/day-content', params: { date } })}
                style={({ pressed }) => [styles.reviewButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.reviewButtonText}>
                  {isPreview ? '📖 본문과 해설 미리 보기' : '📖 처음부터 다시 보기'}
                </ThemedText>
              </Pressable>

              {/* 퀴즈·암송 화면은 date를 넘기면 연습 모드로 돈다(기록·포인트 없음).
                  지난날 복습에도 같은 길이 필요했는데 그동안 캘린더에서 들어갈
                  방법이 없었다. */}
              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/quiz', params: { date } })}
                style={({ pressed }) => [styles.secondaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">
                  {isPreview ? '성경퀴즈 미리 풀어보기' : '성경퀴즈 다시 풀어보기'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/speed-quiz', params: { date } })}
                style={({ pressed }) => [styles.secondaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">
                  {isPreview ? '⏱️ 3초 성경 OX 미리 해보기' : '⏱️ 3초 성경 OX 다시 해보기'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/memorize', params: { date } })}
                style={({ pressed }) => [styles.secondaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">
                  {isPreview ? '암송 퍼즐 미리 해보기' : '암송 퍼즐 다시 해보기'}
                </ThemedText>
              </Pressable>
            </>
          )}

          {!hasContent && isPreview && (
            <ThemedText type="small" themeColor="textSecondary">
              이 날의 해설과 퀴즈는 아직 준비되지 않았습니다. 조금 뒤에 다시 확인해 주세요.
            </ThemedText>
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
  notice: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.one },
  reviewButton: { borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center', marginTop: 4 },
  reviewButtonText: { color: '#fff' },
  secondaryButton: { borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  pressed: { opacity: 0.85 },
});
