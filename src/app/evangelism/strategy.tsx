import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Empty, RoomScreen, Tag } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { getActiveCampaign, type Campaign, type Phase } from '@/db/evangelism';
import { useTheme } from '@/hooks/use-theme';
import { dDayLabel, daysUntil, formatDay, formatRange, kindEmoji, kindLabel, phaseStatus } from '@/lib/evangelism';

/**
 * 교회의 전도전략 — 이웃초청예배를 기점으로 거꾸로 세운 단계들.
 *
 * 단계와 날짜는 교회가 정해 DB 에 둔다(evangelism_phases). 앱은 오늘 날짜로
 * 「지난 단계 · 지금 · 앞으로」를 가를 뿐이라, 일정이 바뀌어도 앱을 고칠 일이 없다.
 */
export default function StrategyScreen() {
  const theme = useTheme();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getActiveCampaign()
        .then((r) => {
          setCampaign(r?.campaign ?? null);
          setPhases(r?.phases ?? []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/evangelism' as Href));

  return (
    <RoomScreen
      title="교회 전도전략"
      emoji="🗺️"
      subtitle={campaign ? `${campaign.eventTitle} ${formatDay(campaign.eventDate)} · ${dDayLabel(campaign.eventDate)}` : undefined}
      onBack={back}>
      {!campaign && !loading ? <Empty text="아직 등록된 전도 일정이 없어요." /> : null}

      {phases.map((p, i) => {
        const st = phaseStatus(p);
        const now = st === 'now';
        return (
          <Card
            key={p.id}
            style={now ? { borderColor: theme.accent, borderWidth: 2 } : st === 'past' ? { opacity: 0.7 } : undefined}>
            <View style={styles.head}>
              <ThemedText style={styles.step}>{i + 1}단계</ThemedText>
              {now ? <Tag label="지금" tone="done" /> : st === 'past' ? <Tag label="지남" /> : <Tag label={`${daysUntil(p.startOn)}일 뒤 시작`} tone="soft" />}
            </View>
            <ThemedText style={styles.title}>{p.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatRange(p.startOn, p.endOn)}
            </ThemedText>
            <ThemedText style={styles.summary}>{p.summary}</ThemedText>

            {p.tasks.length ? <ThemedText type="smallBold" themeColor="textSecondary">성도가 할 일</ThemedText> : null}
            {p.tasks.map((t) => (
              <ThemedText key={t} style={styles.line}>
                • {t}
              </ThemedText>
            ))}
            {p.churchActions.length ? (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sub}>
                교회가 함께 하는 일
              </ThemedText>
            ) : null}
            {p.churchActions.map((t) => (
              <ThemedText key={t} style={styles.line}>
                ⛪ {t}
              </ThemedText>
            ))}
            {p.focusKind ? (
              <ThemedText type="small" themeColor="accent" style={styles.sub}>
                이 단계의 걸음: {kindEmoji(p.focusKind)} {kindLabel(p.focusKind)}
              </ThemedText>
            ) : null}
          </Card>
        );
      })}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  step: { fontSize: 14, fontWeight: '800', opacity: 0.7 },
  title: { fontSize: 18, fontWeight: '800' },
  summary: { fontSize: 16, lineHeight: 24, marginVertical: Spacing.one },
  line: { fontSize: 16, lineHeight: 24 },
  sub: { marginTop: Spacing.two },
});
