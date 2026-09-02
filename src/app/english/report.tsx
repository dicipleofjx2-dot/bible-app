import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { getAttempts, getDiagnosticHistory, getReviewItems } from '@/db/english';
import { formatSeconds } from '@/features/english/QuizRunner';
import { useTheme } from '@/hooks/use-theme';
import { DOMAIN_LABELS, ERROR_CAUSES, TYPE_META } from '@/lib/english/curriculum';
import { allMastery, causeCounts, domainScores, gradeBand, SLOW_RATIO } from '@/lib/english/diagnosis';
import { dueItems } from '@/lib/english/spacedRepetition';
import type { Attempt, DiagnosticResult, Domain, ReviewItem } from '@/lib/english/types';

import { Bar } from './diagnostic';

/**
 * 성장 리포트 + 주간 코칭 (기획서 §8.3 / §11).
 *
 * 「이번 주에 몇 문제 풀었나」로 시작하지 않는다. 학습량은 성과가 아니다.
 * 정답률·속도의 변화, 복습 이행률, 반복 오답 세 가지를 먼저 놓는다.
 */
export default function ReportScreen() {
  const theme = useTheme();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [history, setHistory] = useState<DiagnosticResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getAttempts(1000), getReviewItems(), getDiagnosticHistory()]).then(([a, r, h]) => {
        if (!alive) return;
        setAttempts(a);
        setReviews(r);
        setHistory(h);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const thisWeek = attempts.filter((a) => a.createdAt >= weekAgo);
  const lastWeek = attempts.filter((a) => a.createdAt >= twoWeeksAgo && a.createdAt < weekAgo);

  const mastery = allMastery(attempts);
  const domains = domainScores(mastery);
  const causes = causeCounts(attempts);
  const due = dueItems(reviews);
  const mastered = reviews.filter((r) => r.masteredAt !== null);

  if (attempts.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.page}>
            <ThemedText style={Type.screenTitle}>성장 리포트</ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.body}>
              아직 기록이 없습니다. 진단평가를 한 번 보면 여기에 영역별 그래프가 생깁니다.
            </ThemedText>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const band = gradeBand(attempts.filter((a) => a.correct).length, attempts.length);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>성장 리포트</ThemedText>

          {/* 주간 코칭 */}
          <View style={[styles.card, { borderColor: theme.accent, backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={Type.itemTitle}>이번 주 코칭</ThemedText>
            <Line label="푼 문항" value={`${thisWeek.length}문항 (지난주 ${lastWeek.length})`} />
            <Line
              label="정답률"
              value={`${percent(thisWeek)}% ${deltaText(percent(thisWeek), percent(lastWeek))}`}
            />
            <Line label="평균 풀이시간" value={averageSeconds(thisWeek)} />
            <Line
              label="복습 이행"
              value={`대기 ${due.length}문항 · 완전정복 ${mastered.length}문항`}
            />
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              예상 등급 {band.high}~{band.low}등급 구간 — 총 {attempts.length}문항 기준. 단정값이 아닙니다.
            </ThemedText>
          </View>

          {/* 반복 오답 상위 3개 */}
          {causes.length > 0 ? (
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={Type.sectionTitle}>반복 오답 상위</ThemedText>
              {causes.slice(0, 3).map((c) => (
                <ThemedText key={c.cause} style={Type.itemDescription}>
                  {ERROR_CAUSES[c.cause].emoji} {ERROR_CAUSES[c.cause].label} {c.count}회 — {ERROR_CAUSES[c.cause].nextStep}
                </ThemedText>
              ))}
            </View>
          ) : null}

          <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>영역별 숙련도</ThemedText>
          {(Object.keys(domains) as Domain[]).map((domain) => (
            <Bar key={domain} label={DOMAIN_LABELS[domain]} value={domains[domain]} />
          ))}

          <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>유형별</ThemedText>
          {mastery
            .filter((m) => m.attempts > 0)
            .sort((a, b) => a.score - b.score)
            .map((m) => (
              <View key={m.type} style={styles.typeRow}>
                <Bar label={`${TYPE_META[m.type].emoji} ${TYPE_META[m.type].label}`} value={m.score} />
                <ThemedText themeColor="textSecondary" style={[Type.caption, styles.typeNote]}>
                  {m.correct}/{m.attempts} 정답 · 권장시간의 {m.paceRatio.toFixed(1)}배
                  {m.paceRatio > SLOW_RATIO ? ' — 속도 훈련 필요' : ''}
                </ThemedText>
              </View>
            ))}

          {/* 아직 안 푼 유형은 「못하는 것」이 아니라 「모르는 것」이다. 따로 적는다. */}
          {mastery.some((m) => m.attempts === 0) ? (
            <ThemedText themeColor="textSecondary" style={[Type.caption, styles.blockTitle]}>
              아직 안 풀어 본 유형:{' '}
              {mastery
                .filter((m) => m.attempts === 0)
                .map((m) => TYPE_META[m.type].label)
                .join(', ')}
            </ThemedText>
          ) : null}

          {history.length > 1 ? (
            <>
              <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>진단 추세</ThemedText>
              {history.map((h) => (
                <ThemedText key={h.takenAt} style={Type.itemDescription}>
                  {new Date(h.takenAt).toLocaleDateString('ko-KR')} · {h.correct}/{h.total} · {h.gradeBand.high}~
                  {h.gradeBand.low}등급 구간
                </ThemedText>
              ))}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
        {label}
      </ThemedText>
      <ThemedText style={Type.itemDescription}>{value}</ThemedText>
    </View>
  );
}

function percent(list: Attempt[]): number {
  if (list.length === 0) return 0;
  return Math.round((list.filter((a) => a.correct).length / list.length) * 100);
}

function averageSeconds(list: Attempt[]): string {
  if (list.length === 0) return '—';
  return formatSeconds(Math.round(list.reduce((s, a) => s + a.seconds, 0) / list.length));
}

function deltaText(now: number, before: number): string {
  if (before === 0) return '';
  const diff = now - before;
  if (diff === 0) return '(지난주와 같음)';
  return diff > 0 ? `(▲${diff})` : `(▼${Math.abs(diff)})`;
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
  card: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  blockTitle: { marginTop: Spacing.three },
  typeRow: { gap: 2 },
  typeNote: { paddingLeft: 118 },
});
