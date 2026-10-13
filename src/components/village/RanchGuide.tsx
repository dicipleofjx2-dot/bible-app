import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { FEED_LABELS, FEED_WEIGHTS, type RanchCounts, type RanchState } from '@/lib/ranch';

/**
 * 「목장 활동과 목장 키우기」 설명. 먹이 값은 src/lib/ranch.ts 에서 읽는다 —
 * 글에 숫자를 따로 적어 두면 규칙을 고칠 때 설명이 거짓말이 된다.
 */
export function RanchGuide({ ranch }: { ranch: RanchState | null }) {
  const keys = Object.keys(FEED_WEIGHTS) as (keyof RanchCounts)[];
  return (
    <Card>
      <ThemedText style={styles.title}>🌿 목장 활동과 목장 키우기</ThemedText>
      {ranch ? (
        <ThemedText type="smallBold" themeColor="accent">
          {ranch.nextBreed && ranch.untilNext !== null
            ? `쌓인 먹이 ${ranch.feed} · 먹이 ${ranch.untilNext}만 더 모이면 새 식구가 찾아와요`
            : `쌓인 먹이 ${ranch.feed} · 방주 도감을 모두 채웠어요`}
        </ThemedText>
      ) : null}
      <ThemedText>
        목장이 함께 활동할수록 먹이가 쌓이고, 먹이를 먹은 동물이 자라서 방주 목장이 풍성해집니다.
      </ThemedText>
      <View style={styles.list}>
        {keys.map((k) => (
          <View key={k} style={styles.row}>
            <ThemedText style={styles.item}>{FEED_LABELS[k]}</ThemedText>
            <ThemedText type="smallBold" themeColor="accent">
              먹이 +{FEED_WEIGHTS[k]}
            </ThemedText>
          </View>
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        먹이가 차면 새 식구(양, 염소, 소, 강아지, 고양이…)가 오고, 새끼에서 어린 동물, 다 자란
        동물로 자랍니다. 한 주 쉬어도 동물은 줄어들거나 아파하지 않아요. 돌봄실과 양육실 기록은
        먹이로 세지 않습니다.
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, lineHeight: 26, fontWeight: '700' },
  list: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  item: { flex: 1 },
});
