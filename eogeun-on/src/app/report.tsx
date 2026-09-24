import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/typography';
import { WORD_BY_ID } from '@/content/words';
import { Badge, Bar, Button, Card, Row, Screen, Section, Stat, Title } from '@/features/ui';
import { today } from '@/lib/day';
import { useProgress } from '@/lib/progress';
import { buildReport, loadAdvice, MIN_SAMPLE, type Rate } from '@/lib/report';
import { REASON_LABEL, STAGE_LABEL } from '@/lib/srs';
import type { FailReason, Stage } from '@/lib/types';

function rateText(r: Rate): string {
  return r.pct === null ? '아직' : `${r.pct}%`;
}
function rateNote(r: Rate): string {
  return r.pct === null ? `${MIN_SAMPLE}번 이상 쌓이면 보여요 (지금 ${r.total})` : `${r.ok}/${r.total}번 혼자 떠올림`;
}

/**
 * 성장 보고서(§5-7) + 보호자·교사 화면(§5-8).
 * 새로 배운 개수가 아니라 **며칠 뒤에도 혼자 떠올렸는가**를 맨 위에 둔다.
 * 순위·비교는 없다.
 */
export default function Report() {
  const router = useRouter();
  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const { cards, logs, reset } = useProgress();
  const r = useMemo(() => buildReport(cards, logs, today()), [cards, logs]);
  const stages: Stage[] = ['learning', 'review', 'stable', 'long'];
  const reasons = (Object.entries(r.reasonCounts) as [FailReason, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

  // 확인은 화면 안에서 한 번 더 누르게 한다 — 웹 confirm 창이 막힌 곳이 있다.
  const [armed, setArmed] = useState(false);
  function confirmReset() {
    if (!armed) return setArmed(true);
    void reset().then(() => goHome());
  }

  return (
    <Screen>
      <Title sub="처음 본 뒤 며칠이 지나도 혼자 떠올린 비율이에요. 이것이 진짜 실력이에요.">성장 보고서</Title>
      <Row>
        <Stat label="7일 뒤 독립 회상률" value={rateText(r.recall7)} note={rateNote(r.recall7)} />
        <Stat label="30일 뒤 독립 회상률" value={rateText(r.recall30)} note={rateNote(r.recall30)} />
      </Row>
      <Row>
        <Stat label="누적 학습" value={`${r.totalMinutes}분`} />
        <Stat label="연속 학습" value={`${r.streak}일`} />
        <Stat label="만난 단어" value={`${r.learnedTotal}개`} />
      </Row>

      <Section>기억 단계</Section>
      <Card>
        {stages.map((s) => (
          <Row key={s} style={{ alignItems: 'center' }}>
            <ThemedText style={[Type.itemDescription, { width: 110 }]}>{STAGE_LABEL[s]}</ThemedText>
            <ThemedText style={[Type.itemTitle, { width: 44 }]}>{r.stageCounts[s]}</ThemedText>
            <Row style={{ flex: 1 }}>
              <Bar value={r.stageCounts[s]} total={Math.max(1, r.learnedTotal)} />
            </Row>
          </Row>
        ))}
      </Card>

      <Section>자주 헷갈리는 단어</Section>
      {r.confusing.length ? (
        <Card>
          {r.confusing.map((c) => (
            <Pressable key={c.id} accessibilityRole="link" onPress={() => router.push(`/word/${encodeURIComponent(c.id)}`)}>
              <Row style={{ alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                <ThemedText style={Type.itemTitle}>
                  {c.id} <ThemedText themeColor="textSecondary" style={Type.itemDescription}>{WORD_BY_ID[c.id]?.ko.split(';')[0]}</ThemedText>
                </ThemedText>
                <Row>
                  {c.reason ? <Badge tone="bad" label={REASON_LABEL[c.reason]} /> : null}
                  <Badge label={`${c.lapses}번 놓침`} />
                </Row>
              </Row>
            </Pressable>
          ))}
        </Card>
      ) : (
        <Card><ThemedText themeColor="textSecondary" style={Type.body}>아직 헷갈린 단어가 없어요.</ThemedText></Card>
      )}
      {reasons.length ? (
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          최근 30일 틀린 까닭: {reasons.map(([k, n]) => `${REASON_LABEL[k]} ${n}`).join(' · ')}
        </ThemedText>
      ) : null}

      <Section>보호자·선생님께</Section>
      <Card tone="accent">
        <Row>
          <Badge label={`최근 7일 하루 평균 ${r.avgMinutes7}분`} />
          <Badge label={`최근 14일 중 ${r.activeDays14}일 학습`} />
        </Row>
        <ThemedText style={Type.body}>{loadAdvice(r.avgMinutes7, r.activeDays14)}</ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          학습 기록은 이 기기 안에만 저장돼요. 다른 사람과 순위를 비교하지 않아요.
        </ThemedText>
      </Card>

      <Button variant={armed ? 'bad' : 'ghost'} label={armed ? '한 번 더 누르면 모든 기록이 지워져요 (되돌릴 수 없음)' : '기록 모두 지우기'} onPress={confirmReset} />
      {armed ? <Button variant="ghost" label="취소" onPress={() => setArmed(false)} /> : null}
    </Screen>
  );
}
