import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { QuizRunner } from '@/features/english/QuizRunner';
import { filterQuestions, getQuestion } from '@/lib/english/questionBank';
import type { Difficulty, QuestionTypeId, QuizMode } from '@/lib/english/types';
import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants/theme';
import { PrimaryButton } from '@/features/english/QuizRunner';

/**
 * 풀이 세션 진입점.
 *
 * 어디서 들어오든 이 화면 하나로 모인다. 무엇을 풀지는 주소 파라미터가 정한다.
 *   ids   쉼표로 이은 문항 id — 복습처럼 정확히 그 문항을 풀어야 할 때
 *   type  유형 id — 그 유형 전체를 쉬운 것부터
 *   max   문항 수 상한
 *   mode  study(기본) | exam | diagnostic | review
 *   chain 복습에서 변형 문제를 풀 때 「푼 문항 → 단계를 올릴 원본」 (JSON)
 */
export default function EnglishQuizScreen() {
  const params = useLocalSearchParams<{
    ids?: string;
    type?: string;
    max?: string;
    mode?: string;
    title?: string;
    chain?: string;
  }>();

  const mode = (params.mode as QuizMode) ?? 'study';

  const questions = useMemo(() => {
    if (params.ids) {
      return params.ids
        .split(',')
        .map((id) => getQuestion(id.trim()))
        .filter((q): q is NonNullable<typeof q> => !!q);
    }
    const type = params.type as QuestionTypeId | undefined;
    const pool = filterQuestions(type ? { types: [type] } : {}).sort(
      (a, b) => (a.difficulty as Difficulty) - (b.difficulty as Difficulty),
    );
    const max = params.max ? Number(params.max) : undefined;
    return max && max > 0 ? pool.slice(0, max) : pool;
  }, [params.ids, params.type, params.max]);

  // 복습 세션이 변형 문제를 냈을 때, 단계를 올릴 원본 문항을 찾아 주는 표.
  // 주소로 오는 값이라 깨져 있을 수 있으므로 통째로 감싼다 — 표가 없으면
  // 방금 푼 문항 자신의 복습 항목이 갱신될 뿐, 세션은 정상 진행된다.
  const reviewChain = useMemo(() => {
    if (!params.chain) return undefined;
    try {
      const parsed = JSON.parse(params.chain) as unknown;
      if (!parsed || typeof parsed !== 'object') return undefined;
      const out: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'string') out[key] = value;
      }
      return out;
    } catch {
      return undefined;
    }
  }, [params.chain]);

  if (questions.length === 0) {
    return (
      <ThemedView style={styles.empty}>
        <View style={styles.emptyInner}>
          <ThemedText>풀 문항을 찾지 못했습니다.</ThemedText>
          <PrimaryButton label="돌아가기" onPress={() => router.back()} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <QuizRunner questions={questions} mode={mode} reviewChain={reviewChain} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyInner: { gap: Spacing.three, paddingHorizontal: Spacing.four },
});
