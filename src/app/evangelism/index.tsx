import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Btn, Card, Empty, RoomScreen, SectionTitle, Tag } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import {
  getActiveCampaign,
  getMyTargets,
  getShares,
  getSummary,
  type Campaign,
  type Phase,
  type Summary,
  type Target,
} from '@/db/evangelism';
import { useTheme } from '@/hooks/use-theme';
import {
  ACTION_KINDS,
  currentPhaseIndex,
  dDayLabel,
  formatDay,
  formatRange,
  kindEmoji,
  kindLabel,
} from '@/lib/evangelism';
import { useAuth } from '@/lib/auth';

/**
 * 전도 — 이웃초청예배를 향한 길.
 *
 * 한 화면에 세 가지가 있다: 오늘 우리 교회가 어느 단계인지(전략), 내가 품은
 * 사람들이 어디까지 왔는지(내 대상자), 함께 기도할 사람들(중보 광장).
 * 대상자의 이름·사정은 본인에게만 보인다 — 교회에 나누려면 별명으로 따로 나눈다.
 */
export default function EvangelismHome() {
  const theme = useTheme();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [shareCount, setShareCount] = useState(0);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    const found = await getActiveCampaign().catch(() => null);
    setCampaign(found?.campaign ?? null);
    setPhases(found?.phases ?? []);
    const [mine, shares, sum] = await Promise.all([
      getMyTargets().catch(() => [] as Target[]),
      getShares().catch(() => []),
      found ? getSummary(found.campaign.id).catch(() => null) : Promise.resolve(null),
    ]);
    setTargets(mine);
    setShareCount(shares.length);
    setSummary(sum);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/' as Href));

  if (!session) {
    return (
      <RoomScreen title="전도" emoji="🕊️" onBack={back}>
        <Empty text="로그인하면 전도대상자를 올리고 함께 기도할 수 있어요. 마이페이지에서 로그인해 주세요." />
      </RoomScreen>
    );
  }

  const idx = currentPhaseIndex(phases);
  const phase = idx >= 0 ? phases[idx] : null;
  const dday = campaign ? dDayLabel(campaign.eventDate) : '';

  return (
    <RoomScreen
      title="전도"
      emoji="🕊️"
      subtitle={campaign ? `${campaign.eventTitle} · ${formatDay(campaign.eventDate)}` : undefined}
      onBack={back}>
      {campaign ? (
        <Card style={[styles.banner, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.bannerDday}>{dday}</ThemedText>
          <ThemedText style={styles.bannerTitle}>{campaign.eventTitle}</ThemedText>
          {campaign.description ? (
            <ThemedText style={styles.bannerBody}>{campaign.description}</ThemedText>
          ) : null}
        </Card>
      ) : !loading ? (
        <Empty text="교회에서 정한 전도 일정이 아직 없어요. 그래도 전도대상자를 올리고 기도를 기록할 수 있어요." />
      ) : null}

      {phase ? (
        <>
          <SectionTitle hint={formatRange(phase.startOn, phase.endOn)}>
            지금은 {idx + 1}단계 · {phase.title}
          </SectionTitle>
          <Card onPress={() => router.push('/evangelism/strategy' as Href)}>
            <ThemedText style={styles.summaryLine}>{phase.summary}</ThemedText>
            {phase.tasks.map((t) => (
              <ThemedText key={t} style={styles.task}>
                ✓ {t}
              </ThemedText>
            ))}
            <ThemedText type="small" themeColor="accent" style={styles.more}>
              전체 전도전략 보기 ›
            </ThemedText>
          </Card>
        </>
      ) : null}

      <SectionTitle hint={targets.length ? `${targets.length}명` : undefined}>내가 품은 사람</SectionTitle>
      {targets.length === 0 && !loading ? (
        <Empty text="아직 올린 분이 없어요. 하나님이 마음에 두신 한 사람의 이름을 적어 보세요." />
      ) : (
        targets.map((t) => (
          <Card key={t.id} onPress={() => router.push(`/evangelism/target?id=${t.id}` as Href)}>
            <View style={styles.rowTop}>
              <ThemedText style={styles.name}>{t.name}</ThemedText>
              {t.relation ? <Tag label={t.relation} /> : null}
              {t.shareId ? <Tag label="중보 요청 중" tone="done" /> : null}
            </View>
            <View style={styles.dots}>
              {ACTION_KINDS.map((k) => {
                const on = Boolean(t.done[k.kind]);
                return (
                  <View key={k.kind} style={styles.dotCell}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: on ? theme.done : theme.accentSoft,
                          borderColor: on ? theme.done : theme.border,
                        },
                      ]}>
                      <ThemedText style={styles.dotEmoji}>{on ? '✓' : kindEmoji(k.kind)}</ThemedText>
                    </View>
                    <ThemedText type="small" themeColor={on ? 'text' : 'textSecondary'}>
                      {k.label}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
            {t.actionCount === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                첫 걸음으로 오늘 기도를 기록해 보세요.
              </ThemedText>
            ) : null}
          </Card>
        ))
      )}
      <Btn label="＋ 전도대상자 올리기" onPress={() => router.push('/evangelism/target?id=new' as Href)} />

      <SectionTitle>함께 기도하기</SectionTitle>
      <Card onPress={() => router.push('/evangelism/pray' as Href)}>
        <ThemedText style={styles.name}>🙏 중보기도 광장</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.cardDesc}>
          {shareCount > 0
            ? `성도님들이 나눈 ${shareCount}개의 중보 요청이 있어요. 함께 기도하고 격려를 남겨 주세요.`
            : '아직 나눠진 요청이 없어요. 내 대상자를 별명으로 나누면 성도들이 함께 기도해요.'}
        </ThemedText>
      </Card>

      {summary && summary.targets > 0 ? (
        <>
          <SectionTitle hint="이름 없이 숫자만">우리 교회 전도 현황</SectionTitle>
          <Card>
            <ThemedText style={styles.name}>
              {summary.members}명의 성도가 {summary.targets}분을 품고 있어요
            </ThemedText>
            <View style={styles.stats}>
              {ACTION_KINDS.map((k) => (
                <View key={k.kind} style={styles.stat}>
                  <ThemedText style={styles.statNum}>{summary[k.kind]}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {kindEmoji(k.kind)} {kindLabel(k.kind)}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : null}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  banner: { gap: Spacing.one, alignItems: 'center', paddingVertical: Spacing.four },
  bannerDday: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  bannerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  bannerBody: { color: '#FFFFFF', fontSize: 15, lineHeight: 22, textAlign: 'center', opacity: 0.92 },
  summaryLine: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  task: { fontSize: 16, lineHeight: 24 },
  more: { marginTop: Spacing.one },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  name: { fontSize: 17, fontWeight: '700' },
  cardDesc: { fontSize: 15, lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: Spacing.two },
  dotCell: { alignItems: 'center', gap: 2, flex: 1 },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmoji: { fontSize: 16, color: '#FFFFFF' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.two },
  stat: { minWidth: 64, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
});
