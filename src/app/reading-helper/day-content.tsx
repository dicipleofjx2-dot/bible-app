import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DayLesson } from '@/components/reading-helper/DayLesson';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getStartDate } from '@/lib/readingHelper/db';
import { buildFullPlan, dayNumberForDate, formatChapterRange, type PlanDay } from '@/lib/readingHelper/readingPlan';
import { getBlogPlanDays, mergeWithBlogChapters, type BlogPost } from '@/lib/readingHelper/blogContent';
import { getDayContent } from '@/lib/readingHelper/dayContent';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';

/** Reopens a past archive day at its "처음부분" — the same narrative +
 * 암송구절 content shown on the daily-learning screen for "오늘", but for
 * whatever date the user picked from the archive, so they can restudy the
 * summary and retake the quiz/memorization puzzle from scratch. */
export default function ReadingHelperDayContentScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { date } = useLocalSearchParams<{ date: string }>();

  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<PlanDay | null>(null);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [dayContent, setDayContent] = useState<DayQuizContent | null>(null);
  const [contentError, setContentError] = useState(false);

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
        setLoading(true);
        setContentError(false);
        const dayNumber = dayNumberForDate(startDate, date);
        try {
          const [plan, blogDays, content] = await Promise.all([
            mergeWithBlogChapters(buildFullPlan(startDate)),
            getBlogPlanDays(),
            getDayContent(dayNumber),
          ]);
          if (cancelled) return;
          setDay(plan[dayNumber - 1] ?? null);
          setPost(blogDays[dayNumber - 1]?.post ?? null);
          setDayContent(content);
        } catch {
          if (!cancelled) setContentError(true);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [date, userId])
  );

  const hasQuizContent = dayContent !== null;

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

          {loading ? (
            <ActivityIndicator style={styles.loadingSpacing} />
          ) : (
            <DayLesson post={post} dayContent={dayContent} loading={false} error={contentError} />
          )}

          {hasQuizContent && date && (
            <>
              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/quiz', params: { date } })}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  성경퀴즈 다시 풀기
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/memorize', params: { date } })}
                style={({ pressed }) => [styles.secondaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">암송 퍼즐 다시 하기</ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.five, gap: Spacing.three, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  backRow: { alignSelf: 'flex-start' },
  title: { fontSize: 20, marginTop: 4 },
  loadingSpacing: { marginTop: 20 },
  primaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  secondaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  pressed: { opacity: 0.85 },
});
