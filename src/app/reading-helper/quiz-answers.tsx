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
import { getDayContent } from '@/lib/readingHelper/dayContent';
import type { DayQuizContent, QuizQuestion } from '@/lib/readingHelper/quizTypes';

function correctAnswerLabel(q: QuizQuestion): string {
  if (q.type === 'short') return q.acceptedAnswers[0] ?? '';
  return `${String.fromCharCode(65 + q.correctIndex)}. ${q.choices[q.correctIndex]}`;
}

export default function ReadingHelperQuizAnswersScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { date: reviewDate } = useLocalSearchParams<{ date?: string }>();

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<DayQuizContent | null>(null);

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
        const dayContent = await getDayContent(dayNumber);
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

          {content.questions.map((q, i) => (
            <View key={q.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.questionText}>
                {i + 1}. {q.question}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.backgroundSelected }}>
                정답: {correctAnswerLabel(q)}
              </ThemedText>
              {q.explanation.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  해설: {q.explanation}
                </ThemedText>
              )}
            </View>
          ))}
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
  primaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  pressed: { opacity: 0.85 },
});
