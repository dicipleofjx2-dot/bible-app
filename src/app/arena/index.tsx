import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getTotalRanking, type EscapeTotalRankRow } from '@/lib/arena/db';
import { ESCAPE_ROOMS } from '@/lib/arena/rooms';

/** 성경게임대전 대문. → docs/arena/README.md
 *
 * 1회차는 새부대교회 안에서만 열고 한국어만 쓴다. 문구를 i18n 으로 올리는 것은
 * 종목이 확정된 뒤에 한 번에 한다 — 지금 올리면 문구가 바뀔 때마다 두 곳을
 * 고쳐야 한다. */

type Game = {
  key: string;
  emoji: string;
  title: string;
  desc: string;
  href: string | null;
  /** 아직 안 만든 종목은 눌러도 아무 일이 없다. 그래도 보여 준다 — 무엇이 올지
   * 알아야 대회를 기다리게 된다. */
  ready: boolean;
};

const GAMES: Game[] = [
  {
    key: 'escape',
    emoji: '🚪',
    title: '성경 방탈출',
    desc: '성경의 한 장면에 갇힌다. 자물쇠 넷을 열고 나와라.',
    href: '/arena/escape',
    ready: true,
  },
  {
    key: 'duel',
    emoji: '⚔️',
    title: '둘이 겨루기',
    desc: '같은 방에 둘이 동시에 들어가 누가 먼저 나오는지 겨룹니다.',
    href: '/arena/duel',
    ready: true,
  },
  {
    key: 'speed',
    emoji: '⚡',
    title: '3초 OX',
    desc: '한 문제에 3초. 열 문제를 다 맞혀야 한다.',
    href: '/reading-helper/speed-quiz',
    ready: true,
  },
  {
    key: 'quiz',
    emoji: '📖',
    title: '성경 퀴즈',
    desc: '오늘 읽은 본문에서 나온다.',
    href: '/reading-helper/quiz',
    ready: true,
  },
  {
    key: 'memorize',
    emoji: '🧩',
    title: '암송 퍼즐',
    desc: '흩어진 말씀을 제자리에.',
    href: '/reading-helper/memorize',
    ready: true,
  },
  { key: 'order', emoji: '🔢', title: '사건 순서 맞추기', desc: '준비 중', href: null, ready: false },
  { key: 'map', emoji: '🗺️', title: '성경 지도 찾기', desc: '준비 중', href: null, ready: false },
  { key: 'who', emoji: '👤', title: '인물 스무고개', desc: '준비 중', href: null, ready: false },
];

export default function ArenaHomeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<EscapeTotalRankRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const rows = await getTotalRanking(10);
        if (cancelled) return;
        setRanking(rows);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">← 뒤로</ThemedText>
          </Pressable>

          <ThemedText type="title">🏆 성경게임대전</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
            여러 종목으로 겨루어 마지막에 한 사람, 성경 왕중왕을 뽑습니다. 지금은 상시
            훈련장이 열려 있어요. 여기서 쌓은 기록이 그대로 예선 점수가 됩니다.
          </ThemedText>

          <View style={[styles.stageCard, { backgroundColor: theme.accentSoft }]}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              대회는 이렇게 올라갑니다
            </ThemedText>
            <ThemedText type="small" style={styles.stageLine}>
              상시 훈련장 → 예선(기록전, 상위 32명) → 32강·16강·8강(1:1) → 4강(3종목 2선승)
              → 결승
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              1:1은 두 가지로 할 수 있습니다. 시간을 맞추기 어려우면 각자 편할 때 풀고
              기록으로 겨루고, 함께 있을 때는 ⚔️ 둘이 겨루기로 같은 방에 동시에 들어가
              누가 먼저 나오는지 겨룹니다.
            </ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            종목
          </ThemedText>

          {GAMES.map((g) => (
            <Pressable
              key={g.key}
              disabled={!g.ready}
              onPress={() => g.href && router.push(g.href as never)}
              style={({ pressed }) => [
                styles.gameRow,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                !g.ready && styles.dim,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.gameEmoji}>{g.emoji}</ThemedText>
              <View style={styles.gameBody}>
                <ThemedText type="smallBold">{g.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {g.desc}
                </ThemedText>
              </View>
              {g.ready && <ThemedText type="small" themeColor="textSecondary">›</ThemedText>}
            </Pressable>
          ))}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            방탈출 종합 순위
          </ThemedText>
          {/* 이 설명은 0060 마이그레이션의 셈법과 **같은 말이어야 한다.**
              한쪽만 고치면 "내 점수는 이건데 순위표엔 저것"이 된다. */}
          <ThemedText type="small" themeColor="textSecondary">
            한 방에 두 번까지 들어갈 수 있고 두 판의 평균이 그 방의 점수입니다. 그 점수를
            방마다 합쳐 세웁니다 — 한 방만 잘하는 것보다 여러 방을 두루 나오는 편이 위로
            갑니다.
          </ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loading} />
          ) : ranking.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              아직 아무도 방을 나오지 못했습니다. 첫 탈출자가 되어 보세요.
            </ThemedText>
          ) : (
            <View style={[styles.rankCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {ranking.map((r) => (
                <View key={r.rank} style={styles.rankRow}>
                  <ThemedText type="smallBold" style={[styles.rankNum, r.is_me && { color: theme.accent }]}>
                    {r.rank}
                  </ThemedText>
                  <ThemedText type="small" style={[styles.rankName, r.is_me && { color: theme.accent }]}>
                    {r.display_name}
                    {r.is_me ? ' (나)' : ''}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.rooms_cleared}개 방 · {r.total}점
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            지금 열린 방은 {ESCAPE_ROOMS.length}개입니다. 대회 전까지 계속 늘어납니다.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: { marginBottom: Spacing.two },
  lead: { lineHeight: 20 },
  stageCard: { borderRadius: 12, padding: 14, gap: 6, marginTop: Spacing.two },
  stageLine: { lineHeight: 20 },
  sectionTitle: { marginTop: Spacing.four },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gameEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  gameBody: { flex: 1, minWidth: 0, gap: 2 },
  dim: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  loading: { marginTop: Spacing.three },
  empty: { marginTop: Spacing.two, lineHeight: 20 },
  rankCard: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, marginTop: Spacing.two },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rankNum: { width: 22 },
  rankName: { flex: 1, minWidth: 0 },
  note: { marginTop: Spacing.four, lineHeight: 19 },
});
