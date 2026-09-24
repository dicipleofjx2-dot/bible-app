import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { AskView } from '@/features/study/AskView';
import { WordCard } from '@/features/study/WordCard';
import { Badge, Bar, Button, Card, Row, Screen, Section, Stat, Title } from '@/features/ui';
import { diffDays, today } from '@/lib/day';
import { buildPlan } from '@/lib/plan';
import { WORDS, useProgress } from '@/lib/progress';
import { WORD_BY_ID } from '@/content/words';
import { current, makeCtx, onAnswer, onProbe, onTaught, PHASE_LABEL, startSession, summarize, type SessionState, type Summary } from '@/lib/session';
import { REASON_LABEL } from '@/lib/srs';

/** 한 걸음에 셀 시간의 상한 — 켜 두고 자리를 비운 시간까지 학습 시간으로 치지 않는다. */
const STEP_CAP_SEC = 90;

export default function Study() {
  const router = useRouter();
  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const p = useProgress();
  const { profile, cards, session, ready } = p;
  const [summary, setSummary] = useState<(Summary & { weekend: boolean }) | null>(null);
  const [revealed, setRevealed] = useState(false);
  const tick = useRef(Date.now());
  const ctx = useMemo(() => makeCtx([...WORDS], cards), [cards]);

  // 들어오면 세션을 연다(하던 것이 있으면 그대로).
  useEffect(() => {
    if (!ready || !profile || session || summary) return;
    const plan = buildPlan(today(), [...WORDS], cards, profile);
    if (!plan.reviewIds.length && !plan.newIds.length) return;
    p.setSession(startSession(plan, profile.grade, makeCtx([...WORDS], cards)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profile]);

  const step = session ? current(session) : undefined;
  useEffect(() => setRevealed(false), [step?.t, step?.id]);

  function spent(): number {
    const now = Date.now();
    const sec = Math.min(STEP_CAP_SEC, (now - tick.current) / 1000);
    tick.current = now;
    return sec;
  }

  function advance(next: SessionState) {
    p.addTime(spent());
    if (next.phase === 'done') {
      p.addTime(0, { newCount: next.newIds.length, reviewCount: next.reviewIds.length, completed: true });
      if (next.weekend) p.finishWeekend();
      setSummary({ ...summarize(next), weekend: next.weekend });
      p.setSession(null);
    } else p.setSession(next);
  }

  if (summary) return <Done summary={summary} onHome={() => goHome()} />;

  if (!profile || !session || !step) {
    return (
      <Screen>
        <Card>
          <ThemedText style={Type.body}>{profile ? '오늘 할 학습이 없어요.' : '먼저 진단을 해 주세요.'}</ThemedText>
          <Button label="홈으로" onPress={() => goHome()} />
        </Card>
      </Screen>
    );
  }

  const word = WORD_BY_ID[step.id];
  const total = session.stepsDone + session.queue.length;

  return (
    <Screen>
      <View style={{ gap: Spacing.one }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge label={PHASE_LABEL[session.phase]} tone={session.phase === 'relearn' ? 'bad' : session.phase === 'learn' ? 'gold' : 'accent'} />
          <Button variant="ghost" label="쉬기 ⏸" onPress={() => { p.addTime(spent()); goHome(); }} />
        </Row>
        <Bar value={session.stepsDone} total={total} />
      </View>

      {step.t === 'probe' ? (
        <View style={{ gap: Spacing.three }}>
          <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>새 단어 — 이미 아는 단어인가요?</ThemedText>
          <Card style={{ alignItems: 'center', paddingVertical: Spacing.five }}>
            <ThemedText style={{ fontSize: 44, lineHeight: 52, fontWeight: '800' }}>{word.en}</ThemedText>
          </Card>
          <ThemedText themeColor="textSecondary" style={[Type.itemDescription, { textAlign: 'center' }]}>
            안다고 하면 설명 대신 문제로 확인해요. 맞히면 넘어가고, 내일 한 번 더 봐요.
          </ThemedText>
          <Row>
            <Button big style={{ flex: 1 }} variant="secondary" label="처음 봐요" onPress={() => { p.touch(step.id); advance(onProbe(session, ctx, false)); }} />
            <Button big style={{ flex: 1 }} label="알아요" onPress={() => { p.touch(step.id); advance(onProbe(session, ctx, true)); }} />
          </Row>
        </View>
      ) : step.t === 'teach' ? (
        <View style={{ gap: Spacing.three }}>
          <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
            {step.again ? '다시 보기 — 이번엔 다른 방식으로 물어볼게요' : '새 단어 익히기'}
          </ThemedText>
          {word.base && WORD_BY_ID[word.base] && !step.again ? (
            <Card tone="accent" style={{ padding: Spacing.two }}>
              <ThemedText style={Type.itemDescription}>
                먼저 떠올려요: <ThemedText style={{ fontWeight: '800' }}>{word.base}</ThemedText> 는 무슨 뜻이었죠?
                {revealed || !word.morph ? ` → ${WORD_BY_ID[word.base].ko.split(';')[0]}` : ''}
              </ThemedText>
            </Card>
          ) : null}
          <WordCard word={word} revealed={revealed || !word.morph || step.again} onReveal={() => setRevealed(true)} />
          <Button big label="확인했어요 →" disabled={!!word.morph && !revealed && !step.again} onPress={() => advance(onTaught(session, ctx))} />
        </View>
      ) : (
        <AskView
          key={`${session.stepsDone}-${step.id}`}
          q={step.q}
          word={word}
          onRecord={(o) => p.record(step.id, o)}
          onNext={(ok, reason) => advance(onAnswer(session, ctx, ok, reason))}
        />
      )}
    </Screen>
  );
}

function Done({ summary, onHome }: { summary: Summary & { weekend: boolean }; onHome: () => void }) {
  const { cards } = useProgress();
  const day = today();
  const tomorrow = Object.values(cards).filter((c) => diffDays(c.due, day) === 1).length;
  const week = Object.values(cards).filter((c) => diffDays(c.due, day) >= 2 && diffDays(c.due, day) <= 7).length;
  const pct = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;
  return (
    <Screen>
      <Title sub={summary.weekend ? '이번 주 점검을 마쳤어요. 다음 주 새 단어 수를 결과에 맞춰 조정했어요.' : '오늘 학습을 마쳤어요. 틀린 단어는 내일 다시 꺼내요.'}>
        수고했어요 👏
      </Title>
      <Row>
        <Stat label="오늘 정답률" value={`${pct}%`} note={`${summary.correct}/${summary.total}`} />
        <Stat label="새 단어" value={`${summary.learned}개`} />
        <Stat label="복습" value={`${summary.reviewed}개`} />
      </Row>
      <Section>오늘의 약점</Section>
      {summary.weak.length ? (
        <Card>
          {summary.weak.map((w) => (
            <Row key={w.id} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText style={Type.itemTitle}>{w.id} <ThemedText themeColor="textSecondary" style={Type.itemDescription}>{WORD_BY_ID[w.id]?.ko.split(';')[0]}</ThemedText></ThemedText>
              <Row>{w.reasons.map((r) => <Badge key={r} tone="bad" label={REASON_LABEL[r]} />)}</Row>
            </Row>
          ))}
        </Card>
      ) : (
        <Card tone="good"><ThemedText style={Type.body}>오늘은 틀린 단어가 없어요.</ThemedText></Card>
      )}
      <Section>다음 복습</Section>
      <Card>
        <ThemedText style={Type.body}>내일 {tomorrow}개 · 이번 주 안에 {week}개</ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.caption}>맞힌 단어는 간격이 늘고, 틀린 단어는 내일 다시 와요.</ThemedText>
      </Card>
      <Button big label="홈으로" onPress={onHome} />
    </Screen>
  );
}
