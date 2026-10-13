import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import {
  FEED_LABELS,
  FEED_WEIGHTS,
  formatMinutes,
  HABIT_TARGET,
  POINT_LABELS,
  POINT_WEIGHTS,
  pointsOf,
  type RanchCounts,
  type RanchPoints,
  type RanchState,
} from '@/lib/ranch';

/**
 * 「목장 활동과 목장 키우기」 설명. 먹이 값은 src/lib/ranch.ts 에서 읽는다 —
 * 글에 숫자를 따로 적어 두면 규칙을 고칠 때 설명이 거짓말이 된다.
 */
export function RanchGuide({
  ranch,
  points = null,
  mine = null,
}: {
  ranch: RanchState | null;
  /** 목장 전체 활동 점수 합계 */
  points?: RanchPoints | null;
  /** 내 활동 점수 */
  mine?: RanchPoints | null;
}) {
  const keys = Object.keys(FEED_WEIGHTS) as (keyof RanchCounts)[];
  const pkeys = Object.keys(POINT_WEIGHTS) as (keyof typeof POINT_WEIGHTS)[];
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
      <ThemedText type="smallBold" themeColor="textSecondary">
        함께 예배하고 기도하고 읽을 때 (활동 점수)
      </ThemedText>
      <View style={styles.list}>
        {pkeys.map((k) => (
          <View key={k} style={styles.row}>
            <ThemedText style={styles.item}>{POINT_LABELS[k]}</ThemedText>
            <ThemedText type="smallBold" themeColor="accent">
              {POINT_WEIGHTS[k]}점
            </ThemedText>
          </View>
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        기본 목표는 한 사람이 한 주에 기도 7시간, 통독 {HABIT_TARGET.chaptersPerWeek}장입니다.
        식구가 3명이면 한 주에 기도 21시간, 통독 {3 * HABIT_TARGET.chaptersPerWeek}장이에요.
        목장모임 때 식구마다 이번 주 기도 시간과 통독량을 적으면 목표에 닿은 만큼 점수가
        됩니다(목표를 넘겨도 점수는 목표까지). 출석은 같은 날 한 번만 셉니다.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        목장 식구들의 점수가 모여 먹이가 됩니다(점수 합 ÷ 식구 수). 개인별 순위는 보여 드리지
        않아요.
      </ThemedText>
      {points && points.lastRecorded > 0 ? (
        <ThemedText type="smallBold" themeColor="accent">
          지난 모임 기록 · 기도 {formatMinutes(points.lastPrayerMinutes)} /{' '}
          {formatMinutes(points.membersTotal * HABIT_TARGET.prayerMinutesPerWeek)} · 통독{' '}
          {points.lastChapters} / {points.membersTotal * HABIT_TARGET.chaptersPerWeek}장
        </ThemedText>
      ) : null}
      {points ? (
        <ThemedText type="smallBold" themeColor="accent">
          우리 목장 점수 {pointsOf(points)}점 · 이번 달 함께한 식구 {points.membersActive}/
          {points.membersTotal}명{mine ? ` · 내 점수 ${pointsOf(mine)}점` : ''}
        </ThemedText>
      ) : null}
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
