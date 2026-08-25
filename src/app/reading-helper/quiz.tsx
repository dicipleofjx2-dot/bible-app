import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import type { StringKey } from '@/constants/strings';
import {
  getStartDate,
  quizPoints,
  setQuizScore,
  WORD_CARD_MIN_QUIZ_SCORE,
} from '@/lib/readingHelper/db';
import { currentDayNumber, dayNumberForDate, todayDateString } from '@/lib/readingHelper/readingPlan';
import { getDayContentForDay } from '@/lib/readingHelper/dayContent';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';

function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/**
 * 점수대별 칭찬.
 *
 * 같은 "통과"라도 80점과 100점은 마음이 다르다. 한 문구로 뭉뚱그리면 만점을
 * 맞아도 아무 일이 없다.
 *
 * 문구가 아니라 **열쇠**를 돌려준다. 문구를 직접 돌려주면 이 함수가 모듈을
 * 읽을 때 굳어, 언어를 바꿔도 한글이 남는다.
 */
function praiseKeyFor(score: number): StringKey {
  if (score >= 100) return 'quiz.praise100';
  if (score >= 90) return 'quiz.praise90';
  return 'quiz.praise';
}

export default function ReadingHelperQuizScreen() {
  const theme = useTheme();
  const t = useT();
  const { session } = useAuth();
  const userId = session?.user.id;
  // A `date` param means this was opened from the archive/calendar to review
  // a past day — reviewing doesn't overwrite that day's recorded score or
  // unlock 말씀카드 (that's an "오늘" feature only), it's just practice.
  const { date: reviewDate } = useLocalSearchParams<{ date?: string }>();
  const isReview = !!reviewDate;

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<DayQuizContent | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | string)[]>([]);

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
        const dayNumber = reviewDate ? dayNumberForDate(startDate, reviewDate) : currentDayNumber(startDate);
        const dayContent = await getDayContentForDay(startDate, dayNumber);
        if (!cancelled) {
          setContent(dayContent);
          setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [userId, reviewDate])
  );

  if (loading) {
    return (
      <ThemedView style={styles.centeredScreen}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!content || content.questions.length === 0) {
    return (
      <ThemedView style={styles.centeredScreen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="subtitle">{t('quiz.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
            {t('quiz.notReady')}
          </ThemedText>
          <BackButton />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const total = content.questions.length;
  const question = content.questions[index];
  const answered = question.type === 'choice' ? selectedChoice !== null : shortAnswer.trim().length > 0;

  async function finish(finalCorrectCount: number, finalAnswers: (number | string)[]) {
    const finalScore = Math.round((finalCorrectCount / total) * 100);
    if (!isReview && userId) {
      await setQuizScore(userId, todayDateString(), finalScore);
      // 여기서 「통독 완료로 표시할까요?」를 묻던 것을 뺐다. 달력의 ✓ 기준이
      // **퀴즈 80점 이상**으로 바뀌어(2026-08-24), 이 점수를 저장한 것만으로
      // 이미 기록이 끝났기 때문이다. 물어보면 두 번 하는 일이 된다.
    }
    setAnswers(finalAnswers);
    setScore(finalScore);
  }

  function next() {
    if (!answered || !content) return;
    const q = content.questions[index];
    const currentAnswer: number | string = q.type === 'choice' ? (selectedChoice as number) : shortAnswer;
    const isCorrect =
      q.type === 'choice'
        ? selectedChoice === q.correctIndex
        : q.acceptedAnswers.some((a) => normalizeAnswer(a) === normalizeAnswer(shortAnswer));
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextAnswers = [...answers, currentAnswer];
    setCorrectCount(nextCorrectCount);
    setAnswers(nextAnswers);

    if (index + 1 < total) {
      setIndex(index + 1);
      setSelectedChoice(null);
      setShortAnswer('');
    } else {
      finish(nextCorrectCount, nextAnswers);
    }
  }

  const earnedPoints = isReview ? 0 : quizPoints(score);

  if (score !== null) {
    return (
      <ThemedView style={styles.centeredScreen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="small" themeColor="textSecondary">
            {isReview ? t('quiz.resultReview') : t('quiz.result')} | Day {content.dayNumber}
          </ThemedText>
          <ThemedText style={[styles.scoreText, { color: theme.backgroundSelected }]}>
            {t('quiz.score', { n: score })}
          </ThemedText>

          {isReview ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
              {t('quiz.reviewNotSaved')}
            </ThemedText>
          ) : earnedPoints > 0 ? (
            <View style={[styles.congratsCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.congratsText}>
                {t('quiz.earned', { n: earnedPoints })}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
                {score >= 100
                  ? t('quiz.perfect')
                  : score >= 90
                    ? t('quiz.canGetMore90')
                    : t('quiz.canGetMore')}
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
              {t('quiz.tryAgain', { score: WORD_CARD_MIN_QUIZ_SCORE })}
            </ThemedText>
          )}

          {/*
            말씀카드는 **여기서 상으로 열린다.** 예전에는 통독 홈 아래에 작은
            줄로 늘 놓여 있었는데, 잠겨 있을 때가 대부분이라 눌러 봐야 "80점을
            맞으세요"만 나왔다. 상은 상을 받은 자리에서 줘야 한다.

            복습은 기록에 남지 않으므로 여기서도 열지 않는다.
          */}
          {!isReview && score >= WORD_CARD_MIN_QUIZ_SCORE ? (
            <View style={[styles.congratsCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.congratsText}>{t(praiseKeyFor(score))}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
                {t('quiz.wordCardUnlocked')}
              </ThemedText>
              <Pressable
                onPress={() => router.push('/reading-helper/word-card')}
                style={({ pressed }) => [
                  styles.cardButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">{t('quiz.makeWordCard')}</ThemedText>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/reading-helper/quiz-answers',
                params: { date: reviewDate ?? todayDateString(), answers: JSON.stringify(answers) },
              })
            }
            style={({ pressed }) => [pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="backgroundSelected">
              {t('quiz.showAnswers')}
            </ThemedText>
          </Pressable>

          <BackButton />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="smallBold">
            성경퀴즈 | Day {content.dayNumber}
            {isReview ? t('quiz.headerReview') : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.progressLabel}>
            {index + 1} / {total}
          </ThemedText>

          <ThemedText type="subtitle" style={styles.questionText}>
            {question.question}
          </ThemedText>

          {question.type === 'choice' ? (
            <View style={styles.choiceList}>
              {question.choices.map((choice, i) => {
                const isSelected = selectedChoice === i;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedChoice(i)}
                    style={({ pressed }) => [
                      styles.choiceRow,
                      { backgroundColor: theme.backgroundElement, borderColor: isSelected ? theme.backgroundSelected : 'transparent' },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold">
                      {String.fromCharCode(65 + i)}. {choice}
                    </ThemedText>
                    {isSelected && <ThemedText style={{ color: theme.backgroundSelected }}>✓</ThemedText>}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              value={shortAnswer}
              onChangeText={setShortAnswer}
              placeholder={t('quiz.answerPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.shortAnswerInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            />
          )}

          <Pressable
            onPress={next}
            disabled={!answered}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.backgroundSelected, opacity: answered ? 1 : 0.4 },
              pressed && answered && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              {index + 1 < total ? t('quiz.next') : t('quiz.seeScore')}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BackButton() {
  const theme = useTheme();
  const t = useT();
  return (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <ThemedText type="smallBold">{t('quiz.back')}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centeredScreen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.four, paddingHorizontal: Spacing.five },
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  progressLabel: { textAlign: 'right' },
  bodyText: { textAlign: 'center', lineHeight: 21 },
  questionText: { fontSize: 18, lineHeight: 26 },
  choiceList: { gap: Spacing.two },
  choiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.three,
    borderWidth: 2,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  shortAnswerInput: { borderRadius: Spacing.three, padding: Spacing.four, fontSize: 16 },
  primaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  pressed: { opacity: 0.85 },
  scoreText: { fontSize: 48, fontWeight: '800', },
  congratsCard: { borderRadius: Spacing.four, padding: Spacing.five, alignItems: 'center', gap: Spacing.four, width: '100%' },
  cardButton: {
    minHeight: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  congratsText: { textAlign: 'center', lineHeight: 21 },
});
