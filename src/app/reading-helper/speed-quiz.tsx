import { useAudioPlayer } from 'expo-audio';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { getStartDate, setSpeedQuizSuccess, SPEED_QUIZ_POINTS } from '@/lib/readingHelper/db';
import { getDayContentForDay } from '@/lib/readingHelper/dayContent';
import { currentDayNumber, dayNumberForDate, todayDateString } from '@/lib/readingHelper/readingPlan';
import {
  buildSpeedQuiz,
  SPEED_QUIZ_MIN,
  SPEED_QUIZ_SECONDS,
  type SpeedQuestion,
} from '@/lib/readingHelper/speedQuiz';

const tickSound = require('@/assets/sounds/tick.wav');
const wrongSound = require('@/assets/sounds/wrong-beep.wav');

/** 맞았는지 틀렸는지 보여 주는 시간(ms). 이 동안은 초읽기가 멈춘다.
 * 아무 표시 없이 다음 문제로 넘어가면 무엇을 틀렸는지 끝까지 알 수 없다. */
const FEEDBACK_MS = 700;

type Outcome = 'correct' | 'wrong' | 'timeout';

export default function ReadingHelperSpeedQuizScreen() {
  const theme = useTheme();
  const t = useT();
  const { session } = useAuth();
  const userId = session?.user.id;
  // 지난 날짜를 복습으로 여는 경우. 복습은 기록에 남지 않는다 — 성경퀴즈·암송과
  // 같은 규칙이다.
  const { date: reviewDate } = useLocalSearchParams<{ date?: string }>();
  const isReview = !!reviewDate;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<SpeedQuestion[] | null>(null);
  const [dayNumber, setDayNumber] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        // 로그인 없이 들어와도 풀 수 있다. 문제는 「몇 일차인가」로 정해지고
        // 점수 저장만 로그인이 필요하다(아래 저장 자리에서 이미 거른다).
        // 예전에는 여기서 그냥 돌아가 버려 화면이 영원히 로딩 중이었다.
        const startDate = userId ? await getStartDate(userId) : todayDateString();
        if (!startDate) {
          router.replace('/reading-helper/onboarding');
          return;
        }
        const day = reviewDate ? dayNumberForDate(startDate, reviewDate) : currentDayNumber(startDate);
        const content = await getDayContentForDay(startDate, day);
        if (cancelled) return;
        setDayNumber(day);
        setQuestions(content ? buildSpeedQuiz(content.questions) : []);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [userId, reviewDate])
  );

  if (loading) {
    return (
      <ThemedView style={styles.screen}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!questions || questions.length < SPEED_QUIZ_MIN) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="subtitle">{t('ox.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
            {t('ox.notReady')}
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.wideButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold">{t('quiz.back')}</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <SpeedGame
      key={`${dayNumber}-${reviewDate ?? 'today'}`}
      questions={questions}
      dayNumber={dayNumber}
      isReview={isReview}
      userId={userId}
      onRestart={() => setQuestions(questions.length ? shuffleAgain(questions) : questions)}
    />
  );
}

/** 다시 하기를 누르면 O/X 자리와 순서를 바꿔 낸다. 같은 판을 외워서 푸는
 * 놀이가 아니다. 원본 문항이 없으므로 있는 문제를 섞는 선에서 그친다. */
function shuffleAgain(questions: SpeedQuestion[]): SpeedQuestion[] {
  const out = [...questions];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function SpeedGame({
  questions,
  dayNumber,
  isReview,
  userId,
  onRestart,
}: {
  questions: SpeedQuestion[];
  dayNumber: number;
  isReview: boolean;
  userId: string | undefined;
  onRestart: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const tickPlayer = useAudioPlayer(tickSound);
  const wrongPlayer = useAudioPlayer(wrongSound);

  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SPEED_QUIZ_SECONDS);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  // 초읽기 도중에 답하면 남은 타이머를 반드시 멈춰야 한다. 안 그러면 이미 답한
  // 문제에 시간 초과가 한 번 더 걸려서 맞힌 문제가 틀린 것으로 뒤집힌다.
  const answeredRef = useRef(false);

  // 소리 재생기를 ref에 담아 두고 초읽기 effect의 의존성에서 뺀다.
  //
  // 재생기가 렌더마다 새 값으로 오면 effect가 매번 다시 걸려 **초읽기가 영원히
  // 처음으로 되돌아간다** — 3초가 영영 지나지 않는다. 소리는 부수적인 것이므로
  // 타이머가 그 정체성에 매달리게 두지 않는다.
  const soundsRef = useRef({ tick: tickPlayer, wrong: wrongPlayer });
  soundsRef.current = { tick: tickPlayer, wrong: wrongPlayer };

  const play = useCallback((which: 'tick' | 'wrong') => {
    try {
      const player = soundsRef.current[which];
      player.seekTo(0);
      player.play();
    } catch {
      // 소리가 안 나는 것으로 놀이가 멈추지는 않게 한다.
    }
  }, []);

  const question = questions[index];
  const total = questions.length;

  // 한 문제의 초읽기. 문제가 바뀔 때마다 새로 건다.
  useEffect(() => {
    if (finished || outcome !== null) return;

    answeredRef.current = false;
    setSecondsLeft(SPEED_QUIZ_SECONDS);
    play('tick');

    let left = SPEED_QUIZ_SECONDS;
    const timer = setInterval(() => {
      if (answeredRef.current) return;
      left -= 1;
      if (left > 0) {
        setSecondsLeft(left);
        play('tick');
        return;
      }
      // 3초 안에 답하지 못했다 — 틀린 것으로 하고 넘어간다.
      answeredRef.current = true;
      setSecondsLeft(0);
      play('wrong');
      setOutcome('timeout');
    }, 1000);

    return () => clearInterval(timer);
  }, [index, finished, outcome, play]);

  // 맞았는지 보여 준 뒤 다음 문제로.
  useEffect(() => {
    if (outcome === null) return;
    const timer = setTimeout(() => {
      setOutcome(null);
      if (index + 1 < total) setIndex(index + 1);
      else setFinished(true);
    }, FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [outcome, index, total]);

  // 다 맞혔으면 기록한다. 화면을 그리는 중에 저장하지 않도록 여기서 한다.
  useEffect(() => {
    if (!finished || isReview || !userId) return;
    if (correctCount < total) return;
    setSpeedQuizSuccess(userId, todayDateString()).catch(() => {
      // 저장에 실패해도 결과 화면은 그대로 보여 준다. 다시 풀면 다시 저장된다.
    });
  }, [finished, isReview, userId, correctCount, total]);

  function answer(said: boolean) {
    if (answeredRef.current || outcome !== null) return;
    answeredRef.current = true;
    const right = said === question.isTrue;
    if (right) setCorrectCount((c) => c + 1);
    else play('wrong');
    setOutcome(right ? 'correct' : 'wrong');
  }

  if (finished) {
    const allCorrect = correctCount === total;
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('ox.title')} | Day {dayNumber}
            {isReview ? t('quiz.headerReview') : ''}
          </ThemedText>
          <ThemedText style={[styles.bigScore, { color: theme.backgroundSelected }]}>
            {correctCount} / {total}
          </ThemedText>

          {allCorrect ? (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.cardText}>
                {isReview
                  ? t('ox.allCorrectReview')
                  : t('ox.allCorrect', { n: SPEED_QUIZ_POINTS })}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
                {isReview ? t('quiz.reviewNotSaved') : t('ox.allCorrectNote')}
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
              {t('ox.retryNote', { n: SPEED_QUIZ_POINTS })}
            </ThemedText>
          )}

          <Pressable
            onPress={() => {
              setIndex(0);
              setCorrectCount(0);
              setOutcome(null);
              setFinished(false);
              onRestart();
            }}
            style={({ pressed }) => [
              styles.wideButton,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.onAccent}>
              {t('ox.retry')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.wideButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold">{t('quiz.back')}</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.playArea} edges={['bottom']}>
        <View style={styles.header}>
          <ThemedText type="smallBold">
            {t('ox.title')}
            {isReview ? t('quiz.headerReview') : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {index + 1} / {total}
          </ThemedText>
        </View>

        {/* 남은 초. 소리와 함께 숫자도 보여 준다 — 소리를 끈 채로 하는 사람도 있고,
            버스 안에서는 소리가 아예 안 들린다. */}
        <ThemedText
          style={[
            styles.countdown,
            { color: secondsLeft <= 1 ? theme.done : theme.backgroundSelected },
          ]}>
          {outcome === null ? secondsLeft : ' '}
        </ThemedText>

        {/*
          물음과 답 후보는 **같은 크기**로 둔다. 3초 안에 둘을 다 읽어야 하는데
          물음만 작으면 그것부터 놓친다. 대신 색과 굵기로 갈라 놓는다 — 물음은
          본문색, 답 후보는 강조색에 굵게. 크기로 나누면 작은 쪽이 부수적인
          것처럼 보이지만, 여기서는 둘 다 읽어야 답할 수 있다.
        */}
        <View style={styles.questionArea}>
          <ThemedText style={[styles.prompt, { color: theme.text }]}>{question.prompt}</ThemedText>
          <ThemedText style={[styles.candidate, { color: theme.accent }]}>{question.candidate}</ThemedText>
        </View>

        {outcome === null ? (
          <View style={styles.answerRow}>
            <Pressable
              onPress={() => answer(true)}
              style={({ pressed }) => [
                styles.answerButton,
                { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.answerMark, { color: theme.backgroundSelected }]}>O</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => answer(false)}
              style={({ pressed }) => [
                styles.answerButton,
                { backgroundColor: theme.backgroundElement, borderColor: theme.textSecondary },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.answerMark, { color: theme.textSecondary }]}>X</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.feedback, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.feedbackMark}>
              {outcome === 'correct'
                ? t('ox.correct')
                : outcome === 'timeout'
                  ? t('ox.timeout')
                  : t('ox.wrong')}
            </ThemedText>
            {outcome !== 'correct' && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
                {t('ox.answerIs', { answer: question.answer })}
              </ThemedText>
            )}
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  playArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countdown: { fontSize: 56, fontWeight: '800', textAlign: 'center', lineHeight: 64 },
  questionArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.four },
  prompt: { fontSize: 30, fontWeight: '600', textAlign: 'center', lineHeight: 40 },
  candidate: { fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 42 },
  answerRow: { flexDirection: 'row', gap: Spacing.four },
  answerButton: {
    flex: 1,
    minHeight: 110,
    borderRadius: Spacing.four,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerMark: { fontSize: 52, fontWeight: '800', lineHeight: 62 },
  feedback: { minHeight: 110, borderRadius: Spacing.four, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  feedbackMark: { fontSize: 24, fontWeight: '700' },
  bigScore: { fontSize: 48, fontWeight: '800' },
  card: { borderRadius: Spacing.four, padding: Spacing.five, alignItems: 'center', gap: Spacing.three, width: '100%' },
  cardText: { textAlign: 'center', lineHeight: 22 },
  bodyText: { textAlign: 'center', lineHeight: 21 },
  wideButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center', alignSelf: 'stretch' },
  onAccent: { color: '#fff' },
  pressed: { opacity: 0.85 },
});
