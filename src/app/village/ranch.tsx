import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RanchFrame } from '@/components/RanchFrame';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card, Empty, SectionTitle, Tag } from '@/components/village/kit';
import { RanchGuide } from '@/components/village/RanchGuide';
import { Spacing } from '@/constants/theme';
import { getRanchCounts, getRanchPoints } from '@/db/ranch';
import { useCellRoom } from '@/hooks/use-cell-room';
import { useTheme } from '@/hooks/use-theme';
import { BREEDS, computeRanch, STAGE_LABEL, type RanchCounts, type RanchPoints } from '@/lib/ranch';

/**
 * 방주 목장 — 목장 활동으로 동물이 자란다. 규칙은 src/lib/ranch.ts.
 *
 * 위쪽은 3D 판(WebView/iframe), 아래쪽만 스크롤한다. RoomScreen 을 쓰지 않는
 * 까닭은 그것이 통째로 ScrollView 라서 3D 판을 끌 때 화면이 같이 밀리기 때문이다.
 */
export default function RanchScreen() {
  const theme = useTheme();
  const { room, loading } = useCellRoom();
  const cellId = room?.cell?.id ?? null;
  const [counts, setCounts] = useState<RanchCounts | null>(null);
  const [failed, setFailed] = useState(false);
  const [points, setPoints] = useState<RanchPoints | null>(null);
  const [myPoints, setMyPoints] = useState<RanchPoints | null>(null);

  useEffect(() => {
    if (!cellId) return;
    let alive = true;
    getRanchCounts(cellId)
      .then((c) => alive && setCounts(c))
      .catch(() => alive && setFailed(true));
    getRanchPoints(cellId).then((p) => alive && setPoints(p));
    getRanchPoints(cellId, true).then((p) => alive && setMyPoints(p));
    return () => {
      alive = false;
    };
  }, [cellId]);

  const ranch = useMemo(() => (counts ? computeRanch(counts, points) : null), [counts, points]);
  const items = useMemo<[string, string, string][]>(
    () => (ranch?.animals ?? []).map((a) => [a.key, a.stage, `${a.label} · ${STAGE_LABEL[a.stage]}`]),
    [ranch],
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/village' as Href));

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={[styles.head, { borderBottomColor: theme.border }]}>
          <Pressable onPress={back} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="뒤로">
            <ThemedText style={styles.backIcon} themeColor="accent">
              ‹
            </ThemedText>
          </Pressable>
          <View style={styles.flex}>
            <ThemedText style={styles.title}>🐑 방주 목장</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {room?.cell?.name ?? ''}
            </ThemedText>
          </View>
        </View>

        {loading ? (
          <Empty text="목장을 여는 중입니다…" />
        ) : !cellId ? (
          <Empty text="목장이 정해지면 방주 목장이 열립니다." />
        ) : failed ? (
          <Empty text="목장 소식을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요." />
        ) : !ranch ? (
          <Empty text="동물들을 불러오는 중입니다…" />
        ) : (
          <>
            <View style={styles.stage}>
              <RanchFrame items={items} />
            </View>
            <ScrollView contentContainerStyle={styles.body}>
              <RanchGuide ranch={ranch} points={points} mine={myPoints} />

              <SectionTitle hint={`${ranch.animals.length} / ${BREEDS.length}`}>방주 도감</SectionTitle>
              {BREEDS.map((b, i) => {
                const mine = ranch.animals[i];
                return (
                  <Card key={b.key}>
                    <View style={styles.row}>
                      <ThemedText style={styles.name}>{mine ? b.label : '아직 만나지 못했어요'}</ThemedText>
                      {mine ? <Tag label={STAGE_LABEL[mine.stage]} tone={mine.stage === 'adult' ? 'done' : undefined} /> : null}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {mine ? (b.clean ? '정결한 짐승' : '목장 식구') : '목장 활동이 쌓이면 찾아와요'}
                    </ThemedText>
                  </Card>
                );
              })}
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 34, lineHeight: 38 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  stage: { height: '48%', width: '100%' },
  body: { padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  big: { fontSize: 18, lineHeight: 27, fontWeight: '700' },
  name: { fontSize: 17, lineHeight: 25, fontWeight: '700' },
});
