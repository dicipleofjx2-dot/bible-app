import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { WORD_BY_ID, WORDS } from '@/content/words';
import { Badge, Card, Chip, Row, Screen, Title } from '@/features/ui';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/lib/progress';
import { buildFamilies, KIND_LABEL } from '@/lib/roots';
import type { MorphKind } from '@/lib/types';

/**
 * 어근 지도(§5-5). 하나의 접사·어근에서 익힌 단어 가족을 잇는다.
 * 배운 단어는 진하게, 아직 안 배운 단어는 흐리게 — 「이 가족에 아직 이만큼 남았다」가 보인다.
 * 어원 이야기는 붙이지 않는다. 조각의 뜻과, 어근만 믿으면 틀리는 곳(주의)만 보여 준다.
 */
export default function Roots() {
  const router = useRouter();
  const theme = useTheme();
  const { cards } = useProgress();
  const [kind, setKind] = useState<MorphKind | 'all'>('all');
  const families = useMemo(() => buildFamilies(WORDS), []);
  const shown = families.filter((f) => kind === 'all' || f.kind === kind);

  return (
    <Screen>
      <Title sub="조각의 뜻을 알면 새 단어의 뜻을 예상할 수 있어요. 늘 맞는 것은 아니니 예문으로 확인해요.">어근 지도</Title>
      <Row>
        {(['all', 'prefix', 'suffix', 'root', 'base'] as const).map((k) => (
          <Chip key={k} label={k === 'all' ? '전체' : KIND_LABEL[k]} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </Row>
      {shown.map((f) => {
        const learned = f.ids.filter((id) => cards[id]).length;
        return (
          <Card key={f.key}>
            <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText style={Type.itemTitle}>
                {f.part} <ThemedText themeColor="textSecondary" style={Type.body}>{f.meaning}</ThemedText>
              </ThemedText>
              <Badge label={`${KIND_LABEL[f.kind]} · ${learned}/${f.ids.length}`} tone={learned === f.ids.length ? 'good' : 'accent'} />
            </Row>
            <Row>
              {f.ids.map((id) => {
                const on = !!cards[id];
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="link"
                    accessibilityLabel={`${id} ${on ? '배움' : '아직'}`}
                    onPress={() => router.push(`/word/${encodeURIComponent(id)}`)}
                    style={{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderColor: on ? theme.accent : theme.border, borderStyle: on ? 'solid' : 'dashed', backgroundColor: on ? theme.accentSoft : 'transparent' }}>
                    <ThemedText style={{ fontWeight: on ? '700' : '400', color: on ? theme.accent : theme.textSecondary }}>
                      {id}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </Row>
            {f.ids.some((id) => WORD_BY_ID[id]?.caution && WORD_BY_ID[id].morph) ? (
              <View style={{ gap: Spacing.half }}>
                {f.ids.filter((id) => WORD_BY_ID[id]?.caution && WORD_BY_ID[id].morph).map((id) => (
                  <ThemedText key={id} themeColor="textSecondary" style={Type.caption}>⚠️ {id}: {WORD_BY_ID[id].caution}</ThemedText>
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
