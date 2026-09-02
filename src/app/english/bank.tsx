import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { getSolvedIds } from '@/db/english';
import { PrimaryButton } from '@/features/english/QuizRunner';
import { useTheme } from '@/hooks/use-theme';
import { TYPE_META, TYPE_ORDER } from '@/lib/english/curriculum';
import { filterQuestions, QUESTIONS, validateBank } from '@/lib/english/questionBank';
import type { Difficulty, QuestionTypeId } from '@/lib/english/types';

/**
 * 문제은행 (기획서 §11).
 *
 * 필터는 유형·난이도·풀었는지 세 가지뿐이다. 연도·시험명 필터는 기출을
 * 실을 수 있게 된 뒤에 붙인다 — 지금 실린 문항은 전부 자체 제작이라
 * 있으나 마나 한 필터가 된다.
 */
export default function BankScreen() {
  const theme = useTheme();
  const [types, setTypes] = useState<Set<QuestionTypeId>>(new Set());
  const [maxDifficulty, setMaxDifficulty] = useState<Difficulty | null>(null);
  const [unsolvedOnly, setUnsolvedOnly] = useState(false);
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getSolvedIds().then((s) => {
        if (alive) setSolved(s);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const results = useMemo(
    () =>
      filterQuestions({
        types: types.size > 0 ? [...types] : undefined,
        maxDifficulty: maxDifficulty ?? undefined,
        excludeIds: unsolvedOnly ? solved : undefined,
      }),
    [types, maxDifficulty, unsolvedOnly, solved],
  );

  // 콘텐츠 자체 검사. 개발 중 문항을 늘리다 정답 유일성이나 근거 범위를
  // 깨뜨리면 여기 먼저 뜬다(기획서 §13).
  const problems = useMemo(() => validateBank(), []);

  function toggleType(type: QuestionTypeId) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>문제은행</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            전체 {QUESTIONS.length}문항 · 모두 자체 제작입니다. 기출 원문은 이용 허가가 확인된 뒤에만 싣습니다.
          </ThemedText>

          <ThemedText style={Type.sectionTitle}>유형</ThemedText>
          <View style={styles.chips}>
            {TYPE_ORDER.map((type) => (
              <Chip key={type} label={TYPE_META[type].label} active={types.has(type)} onPress={() => toggleType(type)} />
            ))}
          </View>

          <ThemedText style={Type.sectionTitle}>난이도 상한</ThemedText>
          <View style={styles.chips}>
            {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
              <Chip
                key={d}
                label={`${d} 이하`}
                active={maxDifficulty === d}
                onPress={() => setMaxDifficulty(maxDifficulty === d ? null : d)}
              />
            ))}
            <Chip label="아직 안 푼 것만" active={unsolvedOnly} onPress={() => setUnsolvedOnly((v) => !v)} />
          </View>

          <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>{results.length}문항</ThemedText>
          {results.length > 0 ? (
            <PrimaryButton
              label={`${Math.min(results.length, 10)}문항 풀기`}
              onPress={() =>
                router.push({
                  pathname: '/english/quiz',
                  params: { ids: results.slice(0, 10).map((q) => q.id).join(','), mode: 'study' },
                })
              }
            />
          ) : null}

          {results.map((q) => (
            <Pressable
              key={q.id}
              onPress={() => router.push({ pathname: '/english/quiz', params: { ids: q.id, mode: 'study' } })}
              style={({ pressed }) => [
                styles.row,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <View style={styles.rowText}>
                <ThemedText style={Type.itemTitle}>
                  {TYPE_META[q.type].emoji} {TYPE_META[q.type].label} · 난이도 {q.difficulty}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption} numberOfLines={2}>
                  {q.passage[0]}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  권장 {q.expectedSeconds}초 · {q.source.label}
                  {solved.has(q.id) ? ' · 푼 적 있음' : ''}
                </ThemedText>
              </View>
              <ThemedText themeColor="textSecondary">›</ThemedText>
            </Pressable>
          ))}

          {problems.length > 0 ? (
            <View style={[styles.card, { borderColor: theme.accent, backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={[Type.sectionTitle, { color: theme.accent }]}>문항 검사에서 걸린 것</ThemedText>
              {problems.map((p) => (
                <ThemedText key={p} themeColor="textSecondary" style={Type.caption}>
                  · {p}
                </ThemedText>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accentSoft : 'transparent' },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={[Type.caption, active && { color: theme.accent }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  blockTitle: { marginTop: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
  },
  rowText: { flex: 1, gap: 2 },
  card: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: Spacing.one, marginTop: Spacing.three },
  pressed: { opacity: 0.65 },
});
