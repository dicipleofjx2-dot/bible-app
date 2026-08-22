import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getStartDate, quizPoints, setQuizScore, WORD_CARD_MIN_QUIZ_SCORE } from '@/lib/readingHelper/db';
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
 */
function praiseFor(score: number): string {
  if (score >= 100) return '🏆 당신은 성경박사인가?';
  if (score >= 90) return '🎉 대단합니다!';
  return '👏 수고했습니다!';
}

export default function ReadingHelperQuizScreen() {
  const theme = useTheme();
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
        if (!userId) return;
        const startDate = await getStartDate(userId);
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
          <ThemedText type="subtitle">성경퀴즈</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
            오늘의 퀴즈 콘텐츠는 아직 준비되지 않았습니다.
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
            {isReview ? '복습 결과' : '퀴즈 결과'} | Day {content.dayNumber}
          </ThemedText>
          <ThemedText style={[styles.scoreText, { color: theme.backgroundSelected }]}>{score}점</ThemedText>

          {isReview ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
              복습 결과는 기록에 저장되지 않아요.
            </ThemedText>
          ) : earnedPoints > 0 ? (
            <View style={[styles.congratsCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.congratsText}>🎉 포인트 +{earnedPoints}점을 받았어요!</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
                {score >= 100
                  ? '만점이에요. 오늘도 수고하셨습니다.'
                  : `${score >= 90 ? '100점을 맞으면 30점' : '90점대는 20점, 100점은 30점'}까지 받을 수 있어요.`}
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
              {WORD_CARD_MIN_QUIZ_SCORE}점 이상이면 포인트가 쌓이고 말씀카드도 열려요. 다시 도전해보세요!
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
              <ThemedText style={styles.congratsText}>{praiseFor(score)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
                오늘 말씀카드를 만들 수 있어요.
              </ThemedText>
              <Pressable
                onPress={() => router.push('/reading-helper/word-card')}
                style={({ pressed }) => [
                  styles.cardButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">💌 말씀카드 만들기</ThemedText>
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
              정답/해설확인 ▶
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
            {isReview ? ' (복습)' : ''}
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
              placeholder="정답을 입력하세요"
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
              {index + 1 < total ? '다음' : '점수 확인'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BackButton() {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <ThemedText type="smallBold">돌아가기</ThemedText>
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
