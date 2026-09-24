import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/typography';
import { WORD_BY_ID } from '@/content/words';
import { WordCard } from '@/features/study/WordCard';
import { Badge, Card, Row, Screen } from '@/features/ui';
import { GRADES } from '@/lib/grades';
import { useProgress } from '@/lib/progress';
import { REASON_LABEL, STAGE_LABEL } from '@/lib/srs';

/** 단어 카드 한 장 — 어근 지도와 보고서에서 들어온다. 여기서 보는 것은 복습 기록에 안 남는다. */
export default function WordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards } = useProgress();
  const word = WORD_BY_ID[decodeURIComponent(String(id ?? ''))];
  if (!word) {
    return (
      <Screen>
        <ThemedText>없는 단어예요.</ThemedText>
      </Screen>
    );
  }
  const c = cards[word.id];
  return (
    <Screen>
      <WordCard word={word} autoSpeak={false} />
      <Card>
        <Row>
          <Badge label={`${GRADES[word.grade].label} · 난도 ${word.level}`} />
          <Badge tone={c ? 'good' : 'gold'} label={c ? STAGE_LABEL[c.stage] : '아직 안 배움'} />
        </Row>
        {c ? (
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            다음 복습 {c.due} · 놓친 횟수 {c.lapses}
            {c.lastFail ? ` · 마지막으로 틀린 까닭: ${REASON_LABEL[c.lastFail]}` : ''}
          </ThemedText>
        ) : null}
      </Card>
    </Screen>
  );
}
