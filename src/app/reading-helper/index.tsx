import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DayLesson } from '@/components/reading-helper/DayLesson';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { bskoreaReadUrl } from '@/lib/bskorea';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import {
  getDayRecord,
  getPointsSummary,
  getStartDate,
  MEMORIZATION_POINTS,
  quizPoints,
  resetProgress,
  setReadingComplete,
  SPEED_QUIZ_POINTS,
  WORD_CARD_MIN_QUIZ_SCORE,
  hasLiveSession,
  type PointsSummary,
  getTogetherToday,
  getMissedDates,
  getWeeklyRanking,
  getMyRank,
  type RankRow,
} from '@/lib/readingHelper/db';
import { confirmDestructive } from '@/lib/readingHelper/confirm';
import {
  currentDayNumber,
  buildFullPlan,
  formatChapterRange,
  todayDateString,
  tomorrowDateString,
  msUntilNextDayStart,
  PLAN_TOTAL_DAYS,
  type PlanDay,
  type PlanChapterEntry,
} from '@/lib/readingHelper/readingPlan';

import { getDayContentForDay } from '@/lib/readingHelper/dayContent';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';
import { APP_WINDOW, openAppWindow } from '@/lib/openExternal';

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
  const [todayQuizScore, setTodayQuizScore] = useState(0);
  const [points, setPoints] = useState<PointsSummary | null>(null);
  const [todayPoints, setTodayPoints] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [together, setTogether] = useState<{ readToday: number; joinedTotal: number } | null>(null);
  const [missed, setMissed] = useState<string[]>([]);
  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; points: number; total: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Guards against a slow, now-stale load() call (e.g. from focus) clobbering
  // state from a newer one (e.g. the 4am auto-refresh firing moments later).
  const loadIdRef = useRef(0);

  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;

    // 로그인 없이 들어온 경우 — **문을 막지 않는다.**
    //
    // 예전에는 여기서 그냥 돌아가 버려서, 로그인 안 한 사람에게는 빙글빙글 도는
    // 원만 남았다. 로그인하라는 말조차 없어서 고장으로 보인다.
    //
    // 통독 계획은 시작일만 있으면 계산되고 해설·퀴즈·암송구절은 누구나 읽을 수
    // 있다. 그래서 **오늘 시작한 사람 기준(1일차)**으로 그대로 보여 준다. 저장이
    // 필요한 것(통독 완료·포인트·점수)만 로그인으로 안내한다.
    if (!userId) {
      const guestStart = todayDateString();
      const guestDay = buildFullPlan(guestStart)[0] ?? null;
      if (loadIdRef.current !== loadId) return;
      setDay(guestDay);
      setReadingCompleteState(false);
      setTodayQuizScore(0);
      setPoints(null);
      setTodayPoints(0);
      setChecking(false);
      getTogetherToday().then(setTogether).catch(() => {});
      getWeeklyRanking().then(setRanking).catch(() => {});
      if (!guestDay) {
        setContentLoading(false);
        return;
      }
      setChapters(guestDay.chapters);
      setContentLoading(true);
      setContentError(false);
      try {
        const content = await getDayContentForDay(guestStart, 1);
        if (loadIdRef.current === loadId) setDayContent(content);
      } catch {
        if (loadIdRef.current === loadId) setContentError(true);
      } finally {
        if (loadIdRef.current === loadId) setContentLoading(false);
      }
      return;
    }

    let startDate = await getStartDate(userId);
    if (!startDate) {
      // 로그인이 만료되면 조회가 오류 없이 0건으로 돌아온다(권한이 행을 가릴 뿐
      // 실패로 치지 않는다). 그대로 두면 통독을 해 오던 분을 "처음 시작" 화면으로
      // 보내 버리고, 거기서 시작을 눌러도 저장이 거부돼 빠져나오지 못한다.
      // 정말 처음인지 서버에 한 번 물어보고 가른다.
      const alive = await hasLiveSession();
      if (!alive) {
        setSessionExpired(true);
        setChecking(false);
        return;
      }
      // 살아 있다면 방금 토큰이 갱신됐을 수 있다. 아까 0건이던 것은 옛 토큰이
      // 거부당한 탓일 수 있으므로 **한 번 더 물어본다.** 이걸 안 하면 통독을
      // 해 오던 분이 "처음 시작" 화면으로 떨어진다.
      startDate = await getStartDate(userId);
      if (!startDate) {
        router.replace('/reading-helper/onboarding');
        return;
      }
    }
    const dayNumber = currentDayNumber(startDate);
    const algoPlan = buildFullPlan(startDate);
    const algoDay = algoPlan[dayNumber - 1] ?? algoPlan[algoPlan.length - 1] ?? null;
    const [record, pointsSummary] = await Promise.all([
      getDayRecord(userId, todayDateString()),
      getPointsSummary(userId).catch(() => null),
    ]);
    if (loadIdRef.current !== loadId) return;
    setDay(algoDay);
    setReadingCompleteState(record?.reading_complete ?? false);
    setTodayQuizScore(record?.quiz_score ?? 0);
    setPoints(pointsSummary);
    setTodayPoints(
      quizPoints(record?.quiz_score) +
        (record?.memorization_success ? MEMORIZATION_POINTS : 0) +
        (record?.speed_quiz_success ? SPEED_QUIZ_POINTS : 0)
    );
    setChecking(false);
    getTogetherToday().then(setTogether).catch(() => {});
    getWeeklyRanking().then(setRanking).catch(() => {});
    getMyRank().then(setMyRank).catch(() => {});
    getIsAdmin(userId).then(setIsAdmin).catch(() => setIsAdmin(false));
    getMissedDates(userId, startDate, todayDateString())
      .then(setMissed)
      .catch(() => setMissed([]));

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

  if (checking) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (sessionExpired) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.expiredText}>로그인이 만료되었어요.</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.expiredText}>
          다시 로그인하시면 통독 기록이 그대로 이어집니다.
        </ThemedText>
        <Pressable
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.expiredButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.expiredButtonText}>다시 로그인하기</ThemedText>
        </Pressable>
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

  /**
   * 저장이 필요한 일을 로그인 없이 눌렀을 때.
   *
   * 예전에는 `if (!userId) return` 으로 조용히 아무 일도 안 했다. 눌러도 반응이
   * 없으니 고장으로 보인다. 무엇이 필요한지 말해 주고 로그인 화면을 연다.
   */
  function askToSignIn(what: string) {
    Alert.alert(
      '로그인이 필요해요',
      `${what}은 로그인해야 남길 수 있어요.
지금 보시는 것은 그대로 보실 수 있습니다.`,
      [
        { text: '나중에', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/profile') },
      ]
    );
  }

  async function toggleReadingComplete() {
    if (!userId) {
      askToSignIn('통독 기록');
      return;
    }
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

          {!userId && (
            /* 무엇을 보고 있는 것인지 먼저 말해 준다. 이 안내가 없으면 "왜 Day 1
               이지", "내 기록은 어디 갔지" 가 된다. */
            <Pressable
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [
                styles.guestBanner,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">
                둘러보는 중입니다 — 오늘 시작하면 읽을 1일차예요.{'\n'}
                <ThemedText type="smallBold">로그인하면</ThemedText> 내 진도와 포인트가 이어집니다.
              </ThemedText>
            </Pressable>
          )}

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
            <>
              {/*
                개역개정은 대한성서공회 저작물이라 앱에 담지 않는다. 그 사이트로
                보낸다. 인터넷이 없을 때를 위해 앱에서 읽는 길(오픈성경)을 함께
                둔다 — 링크만 두면 지하철·비행기에서 통독이 막힌다.
              */}
              <Pressable
                onPress={() => {
                  const url = bskoreaReadUrl(chapters[0].bookId, chapters[0].chapter, 1);
                  if (url) openAppWindow(url, APP_WINDOW.bibleReader);
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  📖 오늘 본문 읽기 (개역개정 · 성서공회)
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/read',
                    params: { bookId: String(chapters[0].bookId), chapter: String(chapters[0].chapter) },
                  })
                }
                style={({ pressed }) => [styles.secondaryLink, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  앱에서 읽기 (오픈성경 · 인터넷 없어도 됩니다)
                </ThemedText>
              </Pressable>
            </>
          )}

          {missed.length > 0 ? (
            /* 돌아올 문.
               하루 빠지면 진도가 밀리고, 이틀 밀리면 대개 그만둔다. 지금까지는
               빠진 날이 그냥 빠진 채로 남았다 — 어디서부터 따라잡아야 하는지
               화면 어디에도 없었다.

               「N일 밀렸어요」로 몰아세우지 않는다. 가장 오래된 빠진 날 하나만
               가리켜, 오늘 한 걸음만 더 걸으면 되게 한다. */
            <Pressable
              onPress={() =>
                router.push({ pathname: '/reading-helper/day-detail', params: { date: missed[0] } })
              }
              style={({ pressed }) => [
                styles.missedCard,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">
                못 읽고 지나간 날이 <ThemedText type="smallBold">{missed.length}일</ThemedText> 있어요.{'\n'}
                <ThemedText type="smallBold">{missed[0]}</ThemedText>부터 이어서 읽어 보실래요?
              </ThemedText>
            </Pressable>
          ) : null}

          {together && together.readToday > 0 ? (
            /* 「나만 하는 게 아니구나」 한 줄.
               이름은 오지 않는다(0044) — 누가 했는지 보이면 못 한 사람이
               부끄러워 아예 안 들어온다. 도우려던 것이 정확히 반대로 작동한다.
               0명일 때는 아예 안 보여 준다. "오늘 0명이 읽었어요" 는 격려가
               아니라 찬물이다(새벽에 제일 먼저 여는 사람이 늘 있다). */
            <View style={[styles.togetherRow, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">
                🌿 오늘 <ThemedText type="smallBold">{together.readToday}명</ThemedText>이 함께 읽었어요
                {together.joinedTotal > 0 ? ` · 함께 걷는 분 ${together.joinedTotal}명` : ''}
              </ThemedText>
            </View>
          ) : null}

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
                {points.memorizationCount}회) · 3초 OX {points.speedQuiz}점 ({points.speedQuizCount}회)
              </ThemedText>
            )}
            {/* 규칙을 화면에 그대로 적어 둔다 — 몇 점을 받으면 뭐가 열리는지
                모르면 포인트가 쌓여도 동기가 되지 않는다. */}
            <ThemedText type="small" themeColor="textSecondary">
              성경퀴즈 80점대 10점 · 90점대 20점 · 100점 30점, 암송 성공 {MEMORIZATION_POINTS}점, 3초 OX
              전부 맞히면 {SPEED_QUIZ_POINTS}점
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              오늘 성경퀴즈에서 {WORD_CARD_MIN_QUIZ_SCORE}점 이상을 맞으면 그날 말씀카드를 만들 수 있어요.
            </ThemedText>
          </View>

          {ranking.length > 0 ? (
            /* 이번 주 순위 다섯.
               **누적이 아니라 이번 주**다(0046). 누적으로 세우면 먼저 시작한
               사람이 영원히 위에 있어, 오늘 들어온 분은 아무리 해도 1등을 못
               본다 — 그러면 순위표가 "난 안 되겠다"가 된다.
               위 다섯만 나온다. 꼴찌는 아무도 볼 수 없다. */
            <View style={[styles.rankCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.rankTitle}>
                🏅 이번 주 순위
              </ThemedText>
              {ranking.map((r) => (
                <View key={r.rank} style={styles.rankRow}>
                  <ThemedText type={r.isMe ? 'smallBold' : 'small'} style={styles.rankNo}>
                    {r.rank}등
                  </ThemedText>
                  <ThemedText
                    type={r.isMe ? 'smallBold' : 'small'}
                    style={styles.rankName}
                    numberOfLines={1}>
                    {r.displayName}
                    {r.isMe ? ' (나)' : ''}
                  </ThemedText>
                  <ThemedText
                    type="smallBold"
                    style={[styles.rankPoints, { color: theme.backgroundSelected }]}>
                    {r.points}점
                  </ThemedText>
                </View>
              ))}
              {myRank && myRank.rank > ranking.length ? (
                /* 다섯 등 밖이어도 자기 자리는 보여 준다. 그래야 「조금만 더」가
                   된다. 점수가 아예 없으면 아무 말도 하지 않는다 — 0점 꼴찌라고
                   적어 주는 것은 격려가 아니다. */
                <ThemedText type="small" themeColor="textSecondary" style={styles.rankMine}>
                  나는 {myRank.total}명 중 {myRank.rank}등 · {myRank.points}점
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary" style={styles.rankHint}>
                매주 주일에 새로 시작합니다. 이름은 마이페이지에서 닉네임을 지으면 바뀝니다.
              </ThemedText>
            </View>
          ) : null}

          {isAdmin ? (
            /* 관리자에게만 보이는 입구. 성도에게 보여 봐야 눌러도 막힌다. */
            <Pressable
              onPress={() => router.push('/reading-helper/admin')}
              style={({ pressed }) => [
                styles.secondaryButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">📋 통독 현황판 (관리자)</ThemedText>
            </Pressable>
          ) : null}

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

          {/* 3초 OX는 같은 본문을 두 번째로 만나는 자리다 — 성경퀴즈로 차분히 푼
              뒤에 속도로 한 번 더. 그래서 성경퀴즈 바로 아래에 둔다. */}
          <Pressable
            onPress={() =>
              hasQuizContent
                ? router.push('/reading-helper/speed-quiz')
                : Alert.alert('3초 성경 OX', '오늘의 퀴즈 콘텐츠는 아직 준비되지 않았습니다.')
            }
            style={({ pressed }) => [styles.secondaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">⏱️ 3초 성경 OX</ThemedText>
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

          {/*
            셋을 아이콘 타일로 세운다. 예전에는 작은 글자 세 줄이 나란히 있어서
            무엇이 무엇인지 훑어서는 안 보였고, 손가락으로 누르기에도 작았다.
            앞으로 일주일치는 미리 볼 수 있는데 그런 길이 있다는 걸 아무도 몰랐다.
          */}
          <View style={styles.tileRow}>
            {[
              {
                emoji: '🔭',
                label: '다음 날\n미리 보기',
                go: () =>
                  router.push({
                    pathname: '/reading-helper/day-detail',
                    params: { date: tomorrowDateString() },
                  }),
              },
              { emoji: '📅', label: '통독\n캘린더', go: () => router.push('/reading-helper/calendar') },
              { emoji: '🗂', label: '전체\n아카이브', go: () => router.push('/reading-helper/archive') },
            ].map((t) => (
              <Pressable
                key={t.label}
                onPress={t.go}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.tileEmoji}>{t.emoji}</ThemedText>
                <ThemedText type="small" style={styles.tileLabel}>
                  {t.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* 다시 시작은 통독 기록·퀴즈 점수·포인트를 되돌릴 수 없게 지운다.
              그런데 바로 위 캘린더·아카이브·말씀카드 링크와 생김새가 같아서,
              말씀카드를 만들고 돌아와 아래쪽을 누르다 잘못 짚기 쉬웠다.
              한참 아래로 떼어 놓고 위험한 자리로 보이게 한다. */}
          <View style={styles.resetZone}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.resetHint}>
              통독을 처음부터 다시 하고 싶으실 때만 누르세요. 지금까지의 기록과 포인트가 모두
              지워지고 되돌릴 수 없습니다.
            </ThemedText>
            <Pressable
              onPress={handleReset}
              disabled={resetting}
              style={({ pressed }) => [
                styles.resetButton,
                pressed && styles.pressed,
                resetting && styles.pressed,
              ]}>
              <ThemedText type="small" style={styles.resetButtonText}>
                {resetting ? '초기화하는 중…' : '처음부터 다시 시작'}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  rankCard: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 6,
  },
  rankTitle: { marginBottom: 2 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankNo: { width: 34 },
  rankName: { flex: 1 },
  rankPoints: { minWidth: 44, textAlign: 'right' },
  rankMine: { marginTop: 4 },
  rankHint: { marginTop: 2, lineHeight: 18 },
  missedCard: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  togetherRow: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  guestBanner: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
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
  secondaryLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  secondaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  tileRow: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.two },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Spacing.four,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  tileEmoji: { fontSize: 34, lineHeight: 40 },
  tileLabel: { textAlign: 'center', lineHeight: 17 },
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
  resetZone: { marginTop: 44, gap: 10, alignItems: 'center', paddingHorizontal: 8 },
  resetHint: { textAlign: 'center', lineHeight: 19 },
  resetButton: { borderRadius: 999, borderWidth: 1, borderColor: '#e03131', paddingHorizontal: 18, paddingVertical: 9 },
  resetButtonText: { color: '#e03131' },
  expiredText: { textAlign: 'center' },
  expiredButton: { marginTop: 12, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 11, backgroundColor: '#e8590c' },
  expiredButtonText: { color: '#fff' },
  pressed: { opacity: 0.85 },
});
