import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useI18n, useT } from '@/lib/i18n';
import { getStartDate, MEMORIZATION_POINTS, setMemorizationResult } from '@/lib/readingHelper/db';
import { currentDayNumber, dayNumberForDate, todayDateString } from '@/lib/readingHelper/readingPlan';
import { getDayContentForDay } from '@/lib/readingHelper/dayContent';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';

const MAX_ATTEMPTS = 10;
const wrongBeep = require('@/assets/sounds/wrong-beep.wav');

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Status = 'playing' | 'success' | 'failed';

export default function ReadingHelperMemorizeScreen() {
  const theme = useTheme();
  const t = useT();
  const { lang } = useI18n();
  const beepPlayer = useAudioPlayer(wrongBeep);
  const { session } = useAuth();
  const userId = session?.user.id;
  // A `date` param means this was opened from the archive/calendar to replay
  // a past day's puzzle — that's practice only, it doesn't overwrite the
  // recorded result for that day.
  const { date: reviewDate } = useLocalSearchParams<{ date?: string }>();
  const isReview = !!reviewDate;

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<DayQuizContent | null>(null);

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
        const dayContent = await getDayContentForDay(startDate, dayNumber, lang);
        if (!cancelled) {
          setContent(dayContent);
          setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [userId, reviewDate, lang])
  );

  if (loading) {
    return (
      <ThemedView style={styles.centeredScreen}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!content || content.memorization.words.length === 0) {
    return (
      <ThemedView style={styles.centeredScreen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="subtitle">{t('mem.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
            {t('mem.notReady')}
          </ThemedText>
          <BackButton />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <PuzzleGame
      memorization={content.memorization}
      theme={theme}
      isReview={isReview}
      userId={userId}
      playBeep={() => {
        beepPlayer.seekTo(0);
        beepPlayer.play();
      }}
    />
  );
}

function PuzzleGame({
  memorization,
  theme,
  isReview,
  userId,
  playBeep,
}: {
  memorization: DayQuizContent['memorization'];
  theme: ReturnType<typeof useTheme>;
  isReview: boolean;
  userId: string | undefined;
  playBeep: () => void;
}) {
  const t = useT();
  const { words } = memorization;
  const [pool, setPool] = useState<number[]>(() => shuffle(words.map((_, i) => i)));
  const [slots, setSlots] = useState<(number | null)[]>(() => words.map(() => null));
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [status, setStatus] = useState<Status>('playing');

  const allFilled = slots.every((s) => s !== null);

  function placeWord(key: number) {
    if (status !== 'playing') return;
    if (slots.includes(key)) return; // already placed — ignore a duplicate/stray tap
    const emptyIndex = slots.findIndex((s) => s === null);
    if (emptyIndex === -1) return;
    const next = [...slots];
    next[emptyIndex] = key;
    setSlots(next);
  }

  function returnWord(slotIndex: number) {
    if (status !== 'playing') return;
    if (slots[slotIndex] === null) return;
    const next = [...slots];
    next[slotIndex] = null;
    setSlots(next);
  }

  function submit() {
    if (!allFilled || status !== 'playing') return;
    const isCorrect = slots.every((key, i) => key === i);

    if (isCorrect) {
      setStatus('success');
      if (!isReview && userId) {
        setMemorizationResult(userId, todayDateString(), {
          success: true,
          attemptsUsed: MAX_ATTEMPTS - attemptsLeft + 1,
        });
      }
      return;
    }

    playBeep();
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setSlots(words.map(() => null));
    setPool(shuffle(words.map((_, i) => i)));
    if (remaining <= 0) {
      setStatus('failed');
      if (!isReview && userId) {
        setMemorizationResult(userId, todayDateString(), { success: false, attemptsUsed: MAX_ATTEMPTS });
      }
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {isReview ? t('mem.reviewTitle') : t('mem.todayTitle')}
          </ThemedText>
          <ThemedText type="smallBold">{memorization.reference}</ThemedText>

          {status === 'playing' && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.attemptsLabel}>
              {t('mem.attemptsLeft', { left: attemptsLeft, max: MAX_ATTEMPTS })}
            </ThemedText>
          )}

          <View style={styles.slotRow}>
            {slots.map((key, i) => (
              <Pressable
                key={i}
                onPress={() => returnWord(i)}
                style={[styles.slot, { borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">{key !== null ? words[key] : ''}</ThemedText>
              </Pressable>
            ))}
          </View>

          {status === 'success' && (
            <View style={[styles.resultCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">
                {isReview
                  ? t('mem.successReview')
                  : t('mem.success', { n: MEMORIZATION_POINTS })}
              </ThemedText>
              {isReview && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.answerReveal}>
                  {t('quiz.reviewNotSaved')}
                </ThemedText>
              )}
            </View>
          )}

          {status === 'failed' && (
            <View style={[styles.resultCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{t('mem.failed')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.answerReveal}>
                {t('mem.answerIs', { text: memorization.text })}
              </ThemedText>
            </View>
          )}

          {status === 'playing' && (
            <>
              <View style={styles.poolRow}>
                {pool.map((key) => {
                  const isPlaced = slots.includes(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => placeWord(key)}
                      disabled={isPlaced}
                      style={({ pressed }) => [
                        styles.wordChip,
                        { backgroundColor: theme.backgroundSelected },
                        isPlaced && styles.wordChipPlaced,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="smallBold" style={styles.wordChipText}>
                        {words[key]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={submit}
                disabled={!allFilled}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected, opacity: allFilled ? 1 : 0.4 },
                  pressed && allFilled && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {t('mem.submit')}
                </ThemedText>
              </Pressable>
            </>
          )}

          {status !== 'playing' && <BackButton />}
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
  bodyText: { textAlign: 'center', lineHeight: 21 },
  attemptsLabel: { textAlign: 'right' },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  slot: {
    minWidth: 64,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  poolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: 'auto' },
  wordChip: { borderRadius: 10, paddingVertical: Spacing.three, paddingHorizontal: Spacing.four },
  wordChipPlaced: { opacity: 0, pointerEvents: 'none' },
  wordChipText: { color: '#fff' },
  primaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  pressed: { opacity: 0.85 },
  resultCard: { borderRadius: Spacing.four, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  answerReveal: { textAlign: 'center' },
});
