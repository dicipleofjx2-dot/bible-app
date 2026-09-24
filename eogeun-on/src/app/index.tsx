import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { Badge, Bar, Button, Card, Row, Screen, Section, Stat, Title } from '@/features/ui';
import { today } from '@/lib/day';
import { GRADES } from '@/lib/grades';
import { buildPlan } from '@/lib/plan';
import { WORDS, useProgress } from '@/lib/progress';
import { PHASE_LABEL } from '@/lib/session';

/**
 * 오늘의 홈(§5-1): 남은 시간, 복습 예정 수, 새 단어 수, 「바로 시작」.
 * 순위·점수 경쟁은 두지 않는다(§5-8) — 어제의 나와만 견준다.
 */
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ready, profile, cards, logs, session } = useProgress();
  const day = today();

  const plan = useMemo(() => (profile ? buildPlan(day, [...WORDS], cards, profile) : null), [day, cards, profile]);
  const todayLog = logs.find((l) => l.day === day);
  // 오늘 세션을 끝냈으면 새 단어를 더 꺼내지 않는다 — 20분을 채우려는 반복은 하지 않는다(§3).
  const doneToday = !!todayLog?.completed && !session;
  const studiedMin = Math.round((todayLog?.seconds ?? 0) / 60);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Screen>
      <View style={{ height: insets.top }} />
      <Title sub="오늘 배울 단어를 확인하고, 떠올리고, 틀린 것만 다시.">어근영단어ON</Title>

      {!profile ? (
        <Card tone="accent">
          <ThemedText style={Type.itemTitle}>처음이세요?</ThemedText>
          <ThemedText style={Type.body}>
            학년을 고르고 12문제만 풀어 보세요. 이미 아는 단어는 건너뛰고, 알맞은 난도에서 시작해요.
          </ThemedText>
          <Button big label="진단 시작하기 →" onPress={() => router.push('/diagnose')} />
        </Card>
      ) : (
        <>
          <Card>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge label={`${GRADES[profile.grade].label} · 난도 ${profile.startLevel}부터`} />
              {plan?.weekend ? <Badge tone="gold" label="주말 점검" /> : null}
            </Row>
            {session ? (
              <>
                <ThemedText style={Type.itemTitle}>하던 학습이 있어요</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.body}>
                  「{PHASE_LABEL[session.phase]}」 단계에서 쉬었어요. 이어서 해요.
                </ThemedText>
                <Button big label="이어서 하기 →" onPress={() => router.push('/study')} />
              </>
            ) : doneToday ? (
              <>
                <ThemedText style={Type.itemTitle}>오늘 할 일을 다 했어요 🎉</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.body}>
                  오늘 {studiedMin}분 공부했어요. 억지로 더 하지 않아도 돼요 — 내일 다시 꺼내 볼게요.
                </ThemedText>
              </>
            ) : plan ? (
              <>
                <Row>
                  <Stat label="복습 예정" value={`${plan.reviewIds.length}개`} note={plan.backlog ? `밀린 ${plan.backlog}개는 내일로` : undefined} />
                  <Stat label="새 단어" value={`${plan.newIds.length}개`} note={plan.weekend ? '주말은 점검만' : undefined} />
                  <Stat label="예상 시간" value={`${plan.minutes}분`} note={studiedMin ? `오늘 ${studiedMin}분 함` : undefined} />
                </Row>
                {plan.weekend ? (
                  <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                    이번 주에 틀린 단어와 오래된 단어를 섞어 확인해요. 결과로 다음 주 새 단어 수를 조정해요.
                  </ThemedText>
                ) : null}
                <Button
                  big
                  label={plan.reviewIds.length + plan.newIds.length ? '바로 시작 →' : '새로 배울 단어가 없어요'}
                  disabled={!plan.reviewIds.length && !plan.newIds.length}
                  onPress={() => router.push('/study')}
                />
              </>
            ) : null}
          </Card>

          <Section>오늘의 순서</Section>
          <Card>
            {[
              ['① 기억 깨우기', '복습할 단어를 먼저 떠올려요'],
              ['② 새 단어 익히기', '아는 단어는 문제로 확인하고 넘어가요'],
              ['③ 집중 회상', '보기 없이 직접 떠올려요'],
              ['④ 약점 재학습', '틀린 것만 다른 방식으로 다시'],
              ['⑤ 활용·마무리', '예문 빈칸 채우기'],
            ].map(([a, b]) => (
              <Row key={a} style={{ alignItems: 'baseline' }}>
                <ThemedText style={[Type.itemTitle, { minWidth: 130 }]}>{a}</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>{b}</ThemedText>
              </Row>
            ))}
          </Card>

          <Section>더 보기</Section>
          <Row>
            <Button variant="secondary" label="🌱 어근 지도" onPress={() => router.push('/roots')} style={{ flex: 1 }} />
            <Button variant="secondary" label="📈 성장 보고서" onPress={() => router.push('/report')} style={{ flex: 1 }} />
          </Row>
          <View style={{ gap: Spacing.one }}>
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              지금까지 {Object.keys(cards).length}개 / 전체 {WORDS.filter((w) => w.grade === profile.grade).length}개 ({GRADES[profile.grade].label})
            </ThemedText>
            <Bar value={Object.values(cards).filter((c) => (WORDS.find((w) => w.id === c.id)?.grade ?? '') === profile.grade).length} total={WORDS.filter((w) => w.grade === profile.grade).length} />
          </View>
          <Button variant="ghost" label="학년 바꾸기 · 다시 진단" onPress={() => router.push('/diagnose')} />
        </>
      )}
    </Screen>
  );
}
