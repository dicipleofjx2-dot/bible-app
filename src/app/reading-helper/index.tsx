import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DayLesson } from '@/components/reading-helper/DayLesson';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  getBestQuizScore,
  getDayRecord,
  getPointsSummary,
  getStartDate,
  MEMORIZATION_POINTS,
  quizPoints,
  resetProgress,
  setReadingComplete,
  WORD_CARD_MIN_QUIZ_SCORE,
  type PointsSummary,
} from '@/lib/readingHelper/db';
import { confirmDestructive } from '@/lib/readingHelper/confirm';
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

import { getDayContentForDay } from '@/lib/readingHelper/dayContent';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';

export default function ReadingHelperHomeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [checking, setChecking] = useState(true);
  const [day, setDay] = useState<PlanDay | null>(null);
  const [chapters, setChapters] = useState<PlanChapterEntry[]>([]);

  const [dayContent, setDayContent] = useState<DayQuizContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [readingComplete, setReadingCompleteState] = useState(false);
  const [bestQuizScore, setBestQuizScore] = useState(0);
  const [points, setPoints] = useState<PointsSummary | null>(null);
  const [todayPoints, setTodayPoints] = useState(0);
  const [resetting, setResetting] = useState(false);

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
    const [record, bestScore, pointsSummary] = await Promise.all([
      getDayRecord(userId, todayDateString()),
      getBestQuizScore(userId).catch(() => 0),
      getPointsSummary(userId).catch(() => null),
    ]);
    if (loadIdRef.current !== loadId) return;
    setDay(algoDay);
    setReadingCompleteState(record?.reading_complete ?? false);
    setBestQuizScore(bestScore);
    setPoints(pointsSummary);
    setTodayPoints(
      quizPoints(record?.quiz_score) + (record?.memorization_success ? MEMORIZATION_POINTS : 0)
    );
    setChecking(false);

    if (!algoDay) {
      setContentLoading(false);
      return;
    }
    setChapters(algoDay.chapters);
    setContentLoading(true);
    setContentError(false);
    try {
      // 읽을 범위는 계획 공식(평일 3장·주일 5장)이 곧 기준이고, 해설·퀴즈·암송구절만
      // 우리가 보관한 콘텐츠에서 가져온다. 예전에는 블로그 발행 순서가 기준이었는데,
      // 발행이 멈추면 범위조차 안 보이던 문제가 있었다.
      const content = await getDayContentForDay(startDate, dayNumber);
      if (loadIdRef.current === loadId) setDayContent(content);
    } catch {
      if (loadIdRef.current === loadId) setContentError(true);
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

  // 되돌릴 수 없다. 무엇이 사라지는지 확인 문구에 그대로 적는다 —
  // 특히 포인트는 기록에서 계산되므로 함께 0이 된다.
  async function handleReset() {
    if (!userId || resetting) return;
    const ok = await confirmDestructive(
      '처음부터 다시 시작할까요?',
      `Day 1부터 다시 시작합니다.\n지금까지의 통독 기록·퀴즈 점수·암송 기록이 모두 지워지고, 쌓인 포인트 ${points?.total ?? 0}점도 0점이 됩니다.\n이 작업은 되돌릴 수 없습니다.`,
      '다시 시작'
    );
    if (!ok) return;

    setResetting(true);
    try {
      await resetProgress(userId);
      // 시작일까지 지웠으므로 홈이 온보딩으로 보내 새 시작일을 잡는다.
      router.replace('/reading-helper/onboarding');
    } catch {
      Alert.alert('처음부터 다시 시작', '초기화하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setResetting(false);
    }
  }

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

          {chapters.length > 0 && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/read',
                  params: { bookId: String(chapters[0].bookId), chapter: String(chapters[0].chapter) },
                })
              }
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                📖 오늘 본문 읽기 (개역개정)
              </ThemedText>
            </Pressable>
          )}

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

          <View style={[styles.pointsCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.pointsTopRow}>
              <ThemedText type="smallBold">내 포인트</ThemedText>
              <View style={styles.pointsValueRow}>
                {todayPoints > 0 && (
                  <ThemedText type="small" style={{ color: theme.backgroundSelected }}>
                    오늘 +{todayPoints}
                  </ThemedText>
                )}
                <ThemedText style={[styles.pointsTotal, { color: theme.backgroundSelected }]}>
                  {points ? points.total : 0}점
                </ThemedText>
              </View>
            </View>
            {points && points.total > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                성경퀴즈 {points.quiz}점 ({points.quizCount}회) · 암송 {points.memorization}점 (
                {points.memorizationCount}회)
              </ThemedText>
            )}
            {/* 규칙을 화면에 그대로 적어 둔다 — 몇 점을 받으면 뭐가 열리는지
                모르면 포인트가 쌓여도 동기가 되지 않는다. */}
            <ThemedText type="small" themeColor="textSecondary">
              성경퀴즈 80점대 10점 · 90점대 20점 · 100점 30점, 암송 성공 {MEMORIZATION_POINTS}점
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              성경퀴즈에서 {WORD_CARD_MIN_QUIZ_SCORE}점 이상을 한 번이라도 맞으면 말씀카드를 만들 수 있어요.
            </ThemedText>
          </View>

          <DayLesson dayContent={dayContent} loading={contentLoading} error={contentError} />

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

          <Pressable
            onPress={handleReset}
            disabled={resetting}
            style={({ pressed }) => [styles.resetRow, pressed && styles.pressed, resetting && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              {resetting ? '초기화하는 중…' : '🔄 처음부터 다시 시작'}
            </ThemedText>
          </Pressable>
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
  checkboxMark: { fontSize: 14, fontWeight: '700', color: '#fff' },
  primaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  secondaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.five, paddingTop: Spacing.one },
  pointsCard: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  pointsTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pointsValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  pointsTotal: { fontSize: 22, fontWeight: '700', },
  resetRow: { alignSelf: 'center', paddingTop: Spacing.two, paddingBottom: Spacing.one },
  pressed: { opacity: 0.85 },
});
