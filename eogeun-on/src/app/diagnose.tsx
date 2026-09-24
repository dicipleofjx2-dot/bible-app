import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { WORDS } from '@/content/words';
import { Bar, Button, Card, Chip, Row, Screen, Title } from '@/features/ui';
import { pickDiagnostic, startLevelFrom } from '@/lib/diagnose';
import { GRADE_ORDER, GRADES } from '@/lib/grades';
import { useProgress } from '@/lib/progress';
import { makeQuestion, seeded } from '@/lib/questions';
import { speak } from '@/lib/speech';
import type { Grade, Word } from '@/lib/types';

/**
 * 진단(§5-2). 학년을 고르고, 난도 1·2·3 에서 네 개씩 12문항.
 * 소리를 들려주고 뜻을 고른다 — 듣기·뜻을 한 번에 본다. 모르면 「모르겠어요」.
 * 틀려도 아무 표시를 하지 않는다. 진단은 시험이 아니라 자리 찾기다.
 */
export default function Diagnose() {
  const router = useRouter();
  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const { profile, finishDiagnosis } = useProgress();
  const [grade, setGrade] = useState<Grade | null>(profile?.grade ?? null);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<{ word: Word; ok: boolean }[]>([]);
  const [seed] = useState(() => Date.now() % 100_000);

  const items = useMemo(() => {
    if (!grade) return [];
    const r = seeded(seed);
    return pickDiagnostic(WORDS, grade, r).map((w) => ({ w, q: makeQuestion(w, 'en2ko', grade, [...WORDS], r) }));
  }, [grade, seed]);

  const finished = started && i >= items.length && items.length > 0;

  function answer(ok: boolean) {
    setResults((r) => [...r, { word: items[i].w, ok }]);
    const next = i + 1;
    setI(next);
    if (next < items.length) speak(items[next].w.en);
  }

  if (!started) {
    return (
      <Screen>
        <Title sub="학년은 시작 위치일 뿐이에요. 풀어 본 결과로 실제 난도를 맞춰요.">학년을 골라 주세요</Title>
        <Row>
          {GRADE_ORDER.map((g) => (
            <Chip key={g} label={GRADES[g].ready ? GRADES[g].label : `${GRADES[g].label} (준비 중)`} selected={grade === g} disabled={!GRADES[g].ready} onPress={() => setGrade(g)} />
          ))}
        </Row>
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          유치부·초1~2(그림·소리 학습)와 고등(독해·어근 코스)은 다음 단계에서 열려요.
        </ThemedText>
        <Button
          big
          label="12문제 풀기 →"
          disabled={!grade}
          onPress={() => {
            setStarted(true);
            if (items[0]) speak(items[0].w.en);
          }}
        />
      </Screen>
    );
  }

  if (finished && grade) {
    const ok = results.filter((r) => r.ok).length;
    const level = startLevelFrom(results);
    return (
      <Screen>
        <Title sub={`${results.length}문제 중 ${ok}개를 이미 알고 있어요.`}>자리를 찾았어요</Title>
        <Card tone="accent">
          <ThemedText style={Type.itemTitle}>{GRADES[grade].label} · 난도 {level}부터 시작해요</ThemedText>
          <ThemedText style={Type.body}>
            맞힌 {ok}개는 가르치지 않고 사흘 뒤에 한 번 확인만 해요. 하루 새 단어는 {GRADES[grade].newMin}~{GRADES[grade].newMax}개이고,
            복습이 많은 날에는 자동으로 줄어요.
          </ThemedText>
        </Card>
        <Button
          big
          label="시작하기 →"
          onPress={async () => {
            await finishDiagnosis(grade, results);
            goHome();
          }}
        />
      </Screen>
    );
  }

  const cur = items[i];
  if (!cur) return null;
  return (
    <Screen>
      <View style={{ gap: Spacing.one }}>
        <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>진단 {i + 1} / {items.length}</ThemedText>
        <Bar value={i} total={items.length} />
      </View>
      <Card style={{ alignItems: 'center', paddingVertical: Spacing.four, gap: Spacing.two }}>
        <ThemedText style={{ fontSize: 40, lineHeight: 48, fontWeight: '800' }}>{cur.w.en}</ThemedText>
        <Button variant="ghost" label="🔊 듣기" onPress={() => speak(cur.w.en)} />
      </Card>
      <View style={{ gap: Spacing.two }}>
        {cur.q.options?.map((o) => (
          <Button key={o} big variant="secondary" label={o} onPress={() => answer(o === cur.q.answer)} />
        ))}
        <Button variant="ghost" label="모르겠어요" onPress={() => answer(false)} />
      </View>
    </Screen>
  );
}
