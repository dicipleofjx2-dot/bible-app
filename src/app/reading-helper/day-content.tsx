import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DayLesson } from '@/components/reading-helper/DayLesson';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { getStartDate } from '@/lib/readingHelper/db';
import { buildFullPlan, dayNumberForDate, formatChapterRange, type PlanDay } from '@/lib/readingHelper/readingPlan';

import { getDayContentForDay } from '@/lib/readingHelper/dayContent';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';

/** Reopens a past archive day at its "처음부분" — the same narrative +
 * 암송구절 content shown on the daily-learning screen for "오늘", but for
 * whatever date the user picked from the archive, so they can restudy the
 * summary and retake the quiz/memorization puzzle from scratch. */
export default function ReadingHelperDayContentScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { date } = useLocalSearchParams<{ date: string }>();

  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<PlanDay | null>(null);
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
          const plan = buildFullPlan(startDate);
          const content = await getDayContentForDay(startDate, dayNumber);
          if (cancelled) return;
          setDay(plan[dayNumber - 1] ?? null);
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
            <ThemedText type="smallBold">{t('cal.back')}</ThemedText>
          </Pressable>

          <ThemedText type="subtitle" style={styles.title}>
            {day ? `Day ${day.dayNumber}` : date} {day ? `| ${formatChapterRange(day.chapters, lang)}` : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {date}
          </ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loadingSpacing} />
          ) : (
            <DayLesson dayContent={dayContent} loading={false} error={contentError} />
          )}

          {hasQuizContent && date && (
            <>
              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/quiz', params: { date } })}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {t('dc.quizAgain')}
                </ThemedText>
              </Pressable>

              {/* 3초 OX는 오늘 것만 열려 있었다. 도입 전에 지나간 날들이야말로
                  복습할 자리라, 지난날에도 같은 길을 낸다. */}
              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/speed-quiz', params: { date } })}
                style={({ pressed }) => [styles.secondaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">{t('dc.oxAgain')}</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => router.push({ pathname: '/reading-helper/memorize', params: { date } })}
                style={({ pressed }) => [styles.secondaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">{t('dc.memAgain')}</ThemedText>
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
