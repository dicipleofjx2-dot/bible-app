import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getStartDate } from '@/lib/readingHelper/db';
import { currentDayNumber, dayNumberForDate } from '@/lib/readingHelper/readingPlan';
import { getDayContentForDay } from '@/lib/readingHelper/dayContent';
import type { DayQuizContent, QuizQuestion } from '@/lib/readingHelper/quizTypes';

function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

function correctAnswerLabel(q: QuizQuestion): string {
  if (q.type === 'short') return q.acceptedAnswers[0] ?? '';
  return `${String.fromCharCode(65 + q.correctIndex)}. ${q.choices[q.correctIndex]}`;
}

function userAnswerLabel(q: QuizQuestion, userAnswer: number | string | undefined): string {
  if (userAnswer === undefined || userAnswer === '') return '(답변 없음)';
  if (q.type === 'short') return String(userAnswer);
  const i = Number(userAnswer);
  return `${String.fromCharCode(65 + i)}. ${q.choices[i] ?? ''}`;
}

function isAnswerCorrect(q: QuizQuestion, userAnswer: number | string | undefined): boolean {
  if (userAnswer === undefined || userAnswer === '') return false;
  if (q.type === 'choice') return Number(userAnswer) === q.correctIndex;
  return q.acceptedAnswers.some((a) => normalizeAnswer(a) === normalizeAnswer(String(userAnswer)));
}

export default function ReadingHelperQuizAnswersScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { date: reviewDate, answers: answersParam } = useLocalSearchParams<{ date?: string; answers?: string }>();

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<DayQuizContent | null>(null);

  // 퀴즈를 막 끝내고 넘어온 경우에만 채점 결과가 있다 — 아카이브/캘린더에서
  // 과거 날짜를 복습하러 바로 들어온 경우엔 answers 파라미터 자체가 없어
  // 기존처럼 정답/해설만 보여준다(하위 호환).
  let userAnswers: (number | string)[] | null = null;
  try {
    userAnswers = answersParam ? JSON.parse(answersParam) : null;
  } catch {
    userAnswers = null;
  }

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
          <ThemedText type="subtitle">정답/해설</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
            콘텐츠를 불러오지 못했습니다.
          </ThemedText>
          <BackButton />
        </SafeAreaView>
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

          <ThemedText type="smallBold" themeColor="textSecondary">
            정답/해설 확인 | Day {content.dayNumber}
          </ThemedText>

          {userAnswers && (
            <ThemedText type="smallBold">
              채점 결과: {content.questions.filter((q, i) => isAnswerCorrect(q, userAnswers![i])).length} /{' '}
              {content.questions.length} 문제 정답
            </ThemedText>
          )}

          {content.questions.map((q, i) => {
            const userAnswer = userAnswers?.[i];
            const correct = userAnswers ? isAnswerCorrect(q, userAnswer) : null;
            return (
              <View key={q.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={styles.questionText}>
                  {correct !== null ? (correct ? '✅ ' : '❌ ') : ''}
                  {i + 1}. {q.question}
                </ThemedText>
                {userAnswers && (
                  <ThemedText type="small" style={correct ? styles.correctText : styles.incorrectText}>
                    내 답변: {userAnswerLabel(q, userAnswer)}
                  </ThemedText>
                )}
                <ThemedText type="smallBold" style={{ color: theme.backgroundSelected }}>
                  정답: {correctAnswerLabel(q)}
                </ThemedText>
                {q.explanation.length > 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    해설: {q.explanation}
                  </ThemedText>
                )}
              </View>
            );
          })}
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
  scrollContent: { padding: Spacing.four, gap: Spacing.three, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  backRow: { alignSelf: 'flex-start', marginBottom: 4 },
  bodyText: { textAlign: 'center', lineHeight: 21 },
  card: { borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  questionText: { lineHeight: 22 },
  correctText: { color: '#2f9e44' },
  incorrectText: { color: '#e03131' },
  primaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  pressed: { opacity: 0.85 },
});
