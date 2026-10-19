import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Empty, RoomScreen } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { getActiveCampaign, getRoster, type RosterRow } from '@/db/evangelism';
import { useTheme } from '@/hooks/use-theme';
import { ACTION_KINDS, dDayLabel } from '@/lib/evangelism';

/** 「2026-10-20」→「10/20」 */
function shortDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
}

/**
 * 교회 전체 전도대상자 표 — 성만 보이고 이름은 OO.
 *
 * 이름 가리기는 DB 함수(0091 evangelism_roster)가 한다. 이 화면은 받은 그대로
 * 그린다 — 실명이 여기까지 오지 않으므로 화면 실수로 새는 일이 없다. 메모(사정)는
 * 어떤 경로로도 오지 않는다.
 */
export default function RosterScreen() {
  const theme = useTheme();
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [dday, setDday] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const found = await getActiveCampaign().catch(() => null);
        if (found) {
          setDday(`${found.campaign.eventTitle} ${dDayLabel(found.campaign.eventDate)}`);
          setRows(await getRoster(found.campaign.id).catch(() => []));
        }
        setLoading(false);
      })();
    }, []),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/evangelism' as Href));

  return (
    <RoomScreen title="교회 전도대상자" emoji="📋" subtitle={dday || undefined} onBack={back}>
      {!loading && rows.length === 0 ? (
        <Empty text="아직 올라온 전도대상자가 없어요." />
      ) : (
        <Card style={styles.card}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={[styles.tr, { borderBottomColor: theme.border }]}>
                <ThemedText type="smallBold" style={[styles.th, styles.cName]}>
                  대상자
                </ThemedText>
                <ThemedText type="smallBold" style={[styles.th, styles.cOwner]}>
                  전도자
                </ThemedText>
                <ThemedText type="smallBold" style={[styles.th, styles.cRel]}>
                  관계
                </ThemedText>
                {ACTION_KINDS.map((k) => (
                  <ThemedText key={k.kind} type="smallBold" style={[styles.th, styles.cStep]}>
                    {k.label}
                  </ThemedText>
                ))}
              </View>
              {rows.map((r) => (
                <View key={r.targetId} style={[styles.tr, { borderBottomColor: theme.border }]}>
                  <ThemedText style={[styles.td, styles.cName, styles.bold]} numberOfLines={1}>
                    {r.maskedName}
                  </ThemedText>
                  <ThemedText style={[styles.td, styles.cOwner]} numberOfLines={1}>
                    {r.ownerName}
                  </ThemedText>
                  <ThemedText style={[styles.td, styles.cRel]} themeColor="textSecondary" numberOfLines={1}>
                    {r.relation || '–'}
                  </ThemedText>
                  {ACTION_KINDS.map((k) => {
                    const d = r.done[k.kind];
                    return (
                      <ThemedText
                        key={k.kind}
                        style={[styles.td, styles.cStep, styles.center, d ? { color: theme.done, fontWeight: '700' } : null]}
                        themeColor={d ? undefined : 'textSecondary'}>
                        {d ? shortDay(d) : '–'}
                      </ThemedText>
                    );
                  })}
                </View>
              ))}
              <View style={styles.tr}>
                <ThemedText type="small" themeColor="textSecondary" style={[styles.td, styles.cName]}>
                  합계 {rows.length}명
                </ThemedText>
                <View style={styles.cOwner} />
                <View style={styles.cRel} />
                {ACTION_KINDS.map((k) => (
                  <ThemedText key={k.kind} type="smallBold" style={[styles.td, styles.cStep, styles.center]}>
                    {rows.filter((r) => r.done[k.kind]).length}
                  </ThemedText>
                ))}
              </View>
            </View>
          </ScrollView>
          <ThemedText type="small" themeColor="textSecondary">
            성만 보이고 이름은 가려져요. 칸에는 그 걸음을 가장 최근에 한 날짜가 보여요.
          </ThemedText>
        </Card>
      )}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 44 },
  th: { paddingVertical: Spacing.two },
  td: { fontSize: 15, paddingVertical: Spacing.two },
  bold: { fontWeight: '700' },
  center: { textAlign: 'center' },
  cName: { width: 84, paddingRight: Spacing.two },
  cOwner: { width: 84, paddingRight: Spacing.two },
  cRel: { width: 84, paddingRight: Spacing.two },
  cStep: { width: 54 },
});
