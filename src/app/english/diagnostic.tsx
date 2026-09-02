import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { saveDiagnostic } from '@/db/english';
import { PrimaryButton, QuizRunner, type QuizRecord } from '@/features/english/QuizRunner';
import { useTheme } from '@/hooks/use-theme';
import { DOMAIN_LABELS, ERROR_CAUSES, TYPE_META } from '@/lib/english/curriculum';
import { summarizeDiagnostic } from '@/lib/english/diagnosis';
import { buildDiagnosticSet, DIAGNOSTIC_SET_COUNT } from '@/lib/english/questionBank';
import type { Attempt, DiagnosticResult, Domain } from '@/lib/english/types';

/**
 * 최초 진단평가 (기획서 §5.1).
 *
 * 15개 읽기 유형을 한 문항씩 — 무작위가 아니라 유형마다 하나씩 돌아가며 뽑는다.
 * 그래야 영역별 레이더가 「덜 나온 유형이라 낮은 것」과 「못해서 낮은 것」을
 * 섞지 않는다.
 *
 * 진단은 **시험 모드**로 돈다. 문항마다 해설을 열어 주면 뒤 문항의 실력이
 * 앞 문항의 학습 효과와 뒤섞여 진단이 아니라 수업이 된다.
 */
export default function DiagnosticScreen() {
  const theme = useTheme();
  const [started, setStarted] = useState(false);
  const [setIndex, setSetIndex] = useState(0);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const savedRef = useRef(false);

  const questions = useMemo(() => buildDiagnosticSet(setIndex), [setIndex]);
  const totalSeconds = questions.reduce((s, q) => s + q.expectedSeconds, 0);

  function handleComplete(records: QuizRecord[]) {
    // QuizRunner가 넘겨주는 것은 저장 직전 모양이라 Attempt로 맞춰 준다.
    const attempts: Attempt[] = records.map((r, i) => ({
      ...r.attempt,
      id: r.attemptId > 0 ? r.attemptId : -(i + 1),
      createdAt: Date.now(),
    }));
    const summary = summarizeDiagnostic(attempts);
    setResult(summary);
    if (!savedRef.current) {
      savedRef.current = true;
      saveDiagnostic(summary).catch(() => {});
    }
  }

  if (!started) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <ThemedText style={Type.screenTitle}>진단평가</ThemedText>
          <ThemedText style={Type.body}>
            읽기 {questions.length}개 유형을 한 문항씩 풉니다. 권장 시간은 모두 합쳐 약{' '}
            {Math.round(totalSeconds / 60)}분입니다.
          </ThemedText>

          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={Type.sectionTitle}>무엇을 재나요</ThemedText>
            <ThemedText style={Type.itemDescription}>· 정답률 — 유형별·영역별</ThemedText>
            <ThemedText style={Type.itemDescription}>· 풀이시간 — 권장시간 대비 몇 배가 걸리는가</ThemedText>
            <ThemedText style={Type.itemDescription}>· 확신도 — 찍어서 맞힌 것을 아는 것으로 세지 않기 위해</ThemedText>
            <ThemedText style={Type.itemDescription}>· 근거 문장 — 답이 맞아도 근거가 틀렸는지</ThemedText>
          </View>

          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={Type.sectionTitle}>진행 방식</ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
              진단 중에는 해설이 열리지 않습니다. 앞 문항의 해설이 뒤 문항의 답을 도와주면 그것은 진단이
              아니라 수업이 되기 때문입니다. 끝나면 전체 해설과 4주 처방을 함께 봅니다.
            </ThemedText>
          </View>

          {DIAGNOSTIC_SET_COUNT > 1 ? (
            <View style={styles.setRow}>
              {Array.from({ length: DIAGNOSTIC_SET_COUNT }, (_, i) => (
                <PrimaryButtonSmall
                  key={i}
                  label={`${i + 1}세트`}
                  active={setIndex === i}
                  onPress={() => setSetIndex(i)}
                />
              ))}
            </View>
          ) : null}

          <PrimaryButton label="진단 시작" onPress={() => setStarted(true)} />
        </ScrollView>
      </ThemedView>
    );
  }

  if (result) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <DiagnosticReport result={result} />
          <PrimaryButton label="처방대로 학습 시작" onPress={() => router.replace('/english')} />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <QuizRunner
        questions={questions}
        mode="diagnostic"
        onComplete={handleComplete}
        renderSummary={() => (
          <ThemedText style={Type.body}>채점하는 중…</ThemedText>
        )}
      />
    </ThemedView>
  );
}

export function DiagnosticReport({ result }: { result: DiagnosticResult }) {
  const theme = useTheme();
  const weakest = [...result.byType].filter((m) => m.attempts > 0).sort((a, b) => a.score - b.score);

  return (
    <View style={styles.report}>
      <ThemedText style={Type.screenTitle}>진단 결과</ThemedText>
      <ThemedText style={Type.body}>
        {result.total}문항 중 {result.correct}문항 정답
      </ThemedText>
      <View style={[styles.card, { borderColor: theme.accent, backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={Type.itemTitle}>
          예상 등급 {result.gradeBand.high}~{result.gradeBand.low}등급 구간
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          단정값이 아닙니다. {result.total}문항으로 낸 값이라 구간이 넓습니다 — 30문항을 넘기면 좁아집니다.
        </ThemedText>
      </View>

      <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>영역별</ThemedText>
      {(Object.keys(result.byDomain) as Domain[]).map((domain) => (
        <Bar key={domain} label={DOMAIN_LABELS[domain]} value={result.byDomain[domain]} />
      ))}

      <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>약한 유형</ThemedText>
      {weakest.slice(0, 5).map((m) => (
        <Bar key={m.type} label={`${TYPE_META[m.type].emoji} ${TYPE_META[m.type].label}`} value={m.score} />
      ))}

      {result.topCauses.length > 0 ? (
        <>
          <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>오답 원인</ThemedText>
          {result.topCauses.map((c) => (
            <ThemedText key={c.cause} style={Type.itemDescription}>
              {ERROR_CAUSES[c.cause].emoji} {ERROR_CAUSES[c.cause].label} {c.count}회 — {ERROR_CAUSES[c.cause].diagnosis}
            </ThemedText>
          ))}
        </>
      ) : null}

      <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>4주 처방</ThemedText>
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        {result.prescription.map((line) => (
          <ThemedText key={line} style={Type.itemDescription}>
            · {line}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

export function Bar({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={styles.barRow}>
      <ThemedText style={[Type.itemDescription, styles.barLabel]} numberOfLines={1}>
        {label}
      </ThemedText>
      <View style={[styles.barTrack, { backgroundColor: theme.accentSoft }]}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: value >= 70 ? theme.done : theme.accent, width: `${Math.max(2, Math.min(100, value))}%` },
          ]}
        />
      </View>
      <ThemedText themeColor="textSecondary" style={[Type.caption, styles.barValue]}>
        {value}
      </ThemedText>
    </View>
  );
}

function PrimaryButtonSmall({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <ThemedText
      onPress={onPress}
      style={[
        Type.itemDescription,
        styles.setChip,
        {
          borderColor: active ? theme.accent : theme.border,
          color: active ? theme.accent : theme.textSecondary,
        },
      ]}>
      {label}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  report: { gap: Spacing.two },
  blockTitle: { marginTop: Spacing.three },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  barLabel: { width: 110 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  barValue: { width: 28, textAlign: 'right' },
  setRow: { flexDirection: 'row', gap: Spacing.two },
  setChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
