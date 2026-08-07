import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DayLesson } from '@/components/reading-helper/DayLesson';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { FontFamily } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getBestQuizScore, getDayRecord, getStartDate, setReadingComplete, WORD_CARD_MIN_QUIZ_SCORE } from '@/lib/readingHelper/db';
import {
  currentDayNumber,
  buildFullPlan,
  formatChapterRange,
  todayDateString,
  msUntilNextDayStart,
  PLAN_TOTAL_DAYS,
  type PlanDay,
  type PlanChapterEntry,
} from '@/lib/readingHelper/readingPlan';
import { getBlogPlanDays, mergeWithBlogChapters, type BlogPost } from '@/lib/readingHelper/blogContent';
import { getDayContent } from '@/lib/readingHelper/dayContent';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';

export default function ReadingHelperHomeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [checking, setChecking] = useState(true);
  const [day, setDay] = useState<PlanDay | null>(null);
  const [chapters, setChapters] = useState<PlanChapterEntry[]>([]);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [dayContent, setDayContent] = useState<DayQuizContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [readingComplete, setReadingCompleteState] = useState(false);
  const [bestQuizScore, setBestQuizScore] = useState(0);

  // Guards against a slow, now-stale load() call (e.g. from focus) clobbering
  // state from a newer one (e.g. the 4am auto-refresh firing moments later).
  const loadIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!userId) return;
    const loadId = ++loadIdRef.current;
    const startDate = await getStartDate(userId);
    if (!startDate) {
      router.replace('/reading-helper/onboarding');
      return;
    }
    const dayNumber = currentDayNumber(startDate);
    const algoPlan = buildFullPlan(startDate);
    const algoDay = algoPlan[dayNumber - 1] ?? algoPlan[algoPlan.length - 1] ?? null;
    const [record, bestScore] = await Promise.all([
      getDayRecord(userId, todayDateString()),
      getBestQuizScore(userId).catch(() => 0),
    ]);
    if (loadIdRef.current !== loadId) return;
    setDay(algoDay);
    setReadingCompleteState(record?.reading_complete ?? false);
    setBestQuizScore(bestScore);
    setChecking(false);

    if (!algoDay) {
      setContentLoading(false);
      return;
    }
    setContentLoading(true);
    setContentError(false);
    try {
      // The blog *is* the reading plan's real source of truth — each post is
      // one day's assignment in publish order, which doesn't line up with
      // the calendar-only 3/5-chapter formula. Prefer it whenever the blog
      // has published that far; otherwise this day's official reading just
      // isn't out yet, so show that plainly instead of guessing via the
      // formula.
      const [blogDays, content] = await Promise.all([getBlogPlanDays(), getDayContent(dayNumber)]);
      const blogDay = blogDays[dayNumber - 1] ?? null;
      if (loadIdRef.current === loadId) {
        setChapters(blogDay ? blogDay.chapters : algoDay.chapters);
        setPost(blogDay ? blogDay.post : null);
        setDayContent(content);
      }
    } catch {
      if (loadIdRef.current === loadId) {
        setChapters(algoDay.chapters);
        setContentError(true);
      }
    } finally {
      if (loadIdRef.current === loadId) setContentLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // 매일 오전 4시 자동 갱신 — if the screen is left open across the 4am
  // boundary, reload without waiting for the user to leave and come back.
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, msUntilNextDayStart());
    return () => clearTimeout(timer);
  }, [load, dayContent]);

  if (!userId || checking) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!day) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>읽기 계획을 불러오지 못했습니다.</ThemedText>
      </ThemedView>
    );
  }

  const range = formatChapterRange(chapters);
  const progress = day.dayNumber / PLAN_TOTAL_DAYS;
  const hasQuizContent = dayContent !== null;

  async function toggleReadingComplete() {
    if (!userId) return;
    const next = !readingComplete;
    setReadingCompleteState(next);
    await setReadingComplete(userId, todayDateString(), next);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeAreaOuter}>
        <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.push('/')} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">◀ 데이빗바이블 홈</ThemedText>
          </Pressable>

          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.dayTitle}>
              Day {day.dayNumber} | {range}
            </ThemedText>
            <View style={styles.progressRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {day.dayNumber} / {PLAN_TOTAL_DAYS}
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
              <View
                style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.backgroundSelected }]}
              />
            </View>
          </View>

          <Pressable
            onPress={toggleReadingComplete}
            style={({ pressed }) => [styles.completeRow, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <View
              style={[
                styles.checkbox,
                { borderColor: theme.backgroundSelected },
                readingComplete && { backgroundColor: theme.backgroundSelected },
              ]}>
              {readingComplete && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
            </View>
            <ThemedText type="smallBold">오늘 통독 완료</ThemedText>
          </Pressable>

          <DayLesson post={post} dayContent={dayContent} loading={contentLoading} error={contentError} />

          <Pressable
            onPress={() =>
              hasQuizContent
                ? router.push('/reading-helper/quiz')
                : Alert.alert('성경퀴즈', '오늘의 퀴즈 콘텐츠는 아직 준비되지 않았습니다.')
            }
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              성경퀴즈 풀기
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() =>
              hasQuizContent
                ? router.push('/reading-helper/memorize')
                : Alert.alert('암송 퍼즐', '오늘의 암송구절이 아직 준비되지 않았습니다.')
            }
            style={({ pressed }) => [styles.secondaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">암송 퍼즐 게임</ThemedText>
          </Pressable>

          <View style={styles.linkRow}>
            <Pressable onPress={() => router.push('/reading-helper/calendar')} style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                📅 통독 캘린더
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/reading-helper/archive')} style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                🗂 전체 아카이브
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() =>
                bestQuizScore >= WORD_CARD_MIN_QUIZ_SCORE
                  ? router.push('/reading-helper/word-card')
                  : Alert.alert(
                      '말씀카드',
                      `성경퀴즈에서 ${WORD_CARD_MIN_QUIZ_SCORE}점 이상을 맞으면 말씀카드를 만들 수 있어요. (현재 최고 점수: ${bestQuizScore}점)`,
                    )
              }
              style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                💌 말씀카드 만들기{bestQuizScore < WORD_CARD_MIN_QUIZ_SCORE ? ' 🔒' : ''}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, flexDirection: 'row' },
  safeAreaOuter: { flex: 1, width: '100%' },
  scrollOuter: { flex: 1, width: '100%' },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  backRow: { alignSelf: 'flex-start' },
  header: { gap: Spacing.two },
  dayTitle: { fontSize: 18 },
  progressRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxMark: { fontSize: 14, fontFamily: FontFamily.bold, color: '#fff' },
  primaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  secondaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.five, paddingTop: Spacing.one },
  pressed: { opacity: 0.85 },
});
