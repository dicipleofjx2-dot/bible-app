import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EscapeRun, mmss, type RunResult } from '@/components/arena/EscapeRun';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { findRoom } from '@/lib/arena/rooms';
import {
  findMyMatch,
  championTotal,
  findMyPlayedMatch,
  getBracket,
  getTournament,
  playMatch,
  prizeTable,
  roundName,
  type BracketMatch,
  type Tournament,
} from '@/lib/arena/tournament';

/** 대진표와 내 경기. → docs/arena/README.md */

type Screen = 'bracket' | 'playing' | 'result';

export default function TournamentScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();

  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<BracketMatch[]>([]);
  const [screen, setScreen] = useState<Screen>('bracket');
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tournamentId) return;
    const [t, b] = await Promise.all([getTournament(tournamentId), getBracket(tournamentId)]);
    setTournament(t);
    setBracket(b);
    setLoading(false);
  }, [tournamentId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        if (cancelled) return;
        await load();
      })();
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const myMatch = findMyMatch(bracket, tournament?.current_round ?? null);
  const myPlayed = findMyPlayedMatch(bracket, tournament?.current_round ?? null);
  const room = myMatch ? findRoom(myMatch.room_id) : undefined;

  const handleFinish = useCallback(
    async (r: RunResult) => {
      setResult(r);
      setScreen('result');
      if (!myMatch) return;
      try {
        await playMatch(myMatch.match_id, r.escaped, r.secondsLeft, r.hintsUsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : '결과를 보내지 못했습니다');
      }
      await load();
    },
    [myMatch, load]
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!tournament) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="subtitle">없는 대회입니다</ThemedText>
          <Pressable onPress={() => router.replace('/arena/tournament' as Href)} hitSlop={12}>
            <ThemedText type="smallBold">← 대회 목록</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── 내 경기를 치는 중 ───────────────────────────────────────
  if (screen === 'playing' && myMatch && room) {
    return (
      <EscapeRun
        room={room}
        sideLabel={roundName(myMatch.round)}
        banner={
          <View style={[styles.banner, { backgroundColor: theme.accentSoft }]}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              {roundName(myMatch.round)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              상대 {myMatch.i_am_a ? myMatch.name_b : myMatch.name_a}
            </ThemedText>
          </View>
        }
        onFinish={handleFinish}
      />
    );
  }

  // ── 방금 친 결과 ────────────────────────────────────────────
  if (screen === 'result' && result) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText style={styles.bigEmoji}>{result.escaped ? '🎉' : '⏰'}</ThemedText>
            <ThemedText type="title" style={styles.center}>
              {result.escaped ? '나왔습니다!' : '시간이 다 되었습니다'}
            </ThemedText>
            <View style={[styles.scoreCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="title" style={{ color: theme.accent }}>
                {result.escaped ? result.secondsLeft : 0}점
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {result.escaped ? `${mmss(result.secondsLeft)} 남기고 나왔습니다` : '탈출 실패'} · 힌트{' '}
                {result.hintsUsed}번
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              상대가 칠 때까지 기다립니다. 둘 다 치면 승패가 정해져요.
            </ThemedText>
            {error && (
              <ThemedText type="small" style={[styles.center, { color: theme.accent }]}>
                {error}
              </ThemedText>
            )}
            <Pressable
              onPress={() => {
                setScreen('bracket');
                setResult(null);
                void load();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.onAccent}>
                대진표 보기
              </ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── 대진표 ──────────────────────────────────────────────────
  const rounds = [...new Set(bracket.map((m) => m.round))].sort((a, b) => b - a);

  // 상금표. 본선이 시작되면 확정된 풀(prize_pool)로, 그 전에는 정원이 다 찬다고
  // 보고 미리 셈한다 — 「1등 하면 얼마」를 예선 때부터 알아야 나가고 싶어진다.
  const prizes = prizeTable(
    tournament.bracket_size,
    tournament.entry_fee,
    tournament.sponsor_points,
    tournament.prize_pool
  );
  const champTotal = championTotal(prizes);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.replace('/arena/tournament' as Href)} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">← 대회 목록</ThemedText>
          </Pressable>

          <ThemedText type="title">{tournament.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {tournament.status === 'qualifying'
              ? `예선 진행 중 · ${tournament.qualify_from} ~ ${tournament.qualify_to}`
              : tournament.status === 'bracket' && tournament.current_round
                ? `본선 ${roundName(tournament.current_round)} 진행 중`
                : tournament.status === 'done'
                  ? '끝난 대회'
                  : '준비 중'}
          </ThemedText>

          {/* 상금 안내 — 「1등 하면 얼마」를 알아야 나가고 싶어진다.
              본선이 시작되기 전에는 정원이 다 찬다고 보고 미리 셈해 보여 준다. */}
          {tournament.status !== 'done' && (
            <View style={[styles.prizeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.accent }]}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                🏆 우승하면 최대 {champTotal}포인트
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                참가비 {tournament.entry_fee}점을 빼면 순이익 {champTotal - tournament.entry_fee}점입니다.
                {tournament.prize_pool > 0
                  ? ` 이번 대회 상금은 모두 ${tournament.prize_pool}점.`
                  : ` 정원이 다 차면 상금은 모두 ${tournament.entry_fee * tournament.bracket_size + tournament.sponsor_points}점이 됩니다.`}
              </ThemedText>

              <View style={styles.prizeRows}>
                {prizes.map((p) => (
                  <View key={p.round} style={styles.prizeRow}>
                    <ThemedText type="small" style={styles.prizeLabel}>
                      {roundName(p.round)} 승
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.prizeWho}>
                      {p.winners}명
                    </ThemedText>
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      +{p.perWinner}점
                    </ThemedText>
                  </View>
                ))}
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                한 판만 이겨도 참가비보다 많이 받습니다. 이기고 올라갈수록 상금이 두 배씩
                커져요.
              </ThemedText>
            </View>
          )}

          {/* 예선 중 — 대진표가 아직 없다 */}
          {tournament.status === 'qualifying' && (
            <View style={[styles.card, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                지금은 예선입니다 · 참가비 없음
              </ThemedText>
              <ThemedText type="small" style={styles.line}>
                이 기간에 방탈출에서 쌓은 점수로 상위 {tournament.bracket_size}명이 본선에
                올라갑니다. 방마다 두 번까지 치고 두 판의 평균이 그 방의 점수이며, 그것을
                방마다 합칩니다.
              </ThemedText>
              <ThemedText type="small" style={styles.line}>
                예선은 누구나 공짜입니다. 참가비 {tournament.entry_fee}점은 본선에 오를 때만
                빠집니다 — 포인트가 모자라면 그 자리는 다음 순위 사람에게 갑니다.
              </ThemedText>
              <Pressable
                onPress={() => router.push('/arena/escape' as Href)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.onAccent}>
                  방탈출 하러 가기
                </ThemedText>
              </Pressable>
            </View>
          )}

          {/* 내 경기 */}
          {myMatch && room && (
            <View style={[styles.myMatchCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                내 경기 · {roundName(myMatch.round)}
              </ThemedText>
              <ThemedText type="small" style={styles.line}>
                상대 {myMatch.i_am_a ? myMatch.name_b : myMatch.name_a} · {room.emoji} {room.title}
              </ThemedText>
              {myMatch.deadline && (
                <ThemedText type="small" themeColor="textSecondary">
                  마감 {new Date(myMatch.deadline).toLocaleString('ko-KR')}
                </ThemedText>
              )}
              <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                한 번만 칠 수 있습니다. 마감까지 안 치면 부전패예요.
              </ThemedText>
              <Pressable
                onPress={() => setScreen('playing')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.onAccent}>
                  지금 치기
                </ThemedText>
              </Pressable>
            </View>
          )}

          {!myMatch && myPlayed && !myPlayed.winner_name && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="smallBold">내 경기는 마쳤습니다</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                상대가 칠 때까지 기다립니다. 둘 다 치면 승패가 정해져요.
              </ThemedText>
            </View>
          )}

          {/* 대진표 */}
          {rounds.map((round) => (
            <View key={round} style={styles.roundBlock}>
              <ThemedText type="subtitle" style={styles.roundTitle}>
                {roundName(round)}
              </ThemedText>
              {bracket
                .filter((m) => m.round === round)
                .map((m) => {
                  const mine = m.i_am_a || m.i_am_b;
                  const r = findRoom(m.room_id);
                  return (
                    <View
                      key={m.match_id}
                      style={[
                        styles.matchCard,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: mine ? theme.accent : theme.border,
                        },
                      ]}>
                      <View style={styles.sideRow}>
                        <ThemedText
                          type={m.winner_name && m.winner_name === m.name_a ? 'smallBold' : 'small'}
                          style={[styles.sideName, m.i_am_a && { color: theme.accent }]}>
                          {m.name_a ?? '—'}
                          {m.i_am_a ? ' (나)' : ''}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {m.played_a ? `${m.score_a ?? 0}점` : '미실시'}
                        </ThemedText>
                      </View>
                      <View style={styles.sideRow}>
                        <ThemedText
                          type={m.winner_name && m.winner_name === m.name_b ? 'smallBold' : 'small'}
                          style={[styles.sideName, m.i_am_b && { color: theme.accent }]}>
                          {m.name_b ?? '— (부전승)'}
                          {m.i_am_b ? ' (나)' : ''}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {m.played_b ? `${m.score_b ?? 0}점` : m.name_b ? '미실시' : ''}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.matchFoot}>
                        {r ? `${r.emoji} ${r.title}` : m.room_id}
                        {m.winner_name ? ` · 승 ${m.winner_name}` : ''}
                      </ThemedText>
                    </View>
                  );
                })}
            </View>
          ))}

          {tournament.status === 'done' && bracket.length > 0 && (
            <View style={[styles.champCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText style={styles.bigEmoji}>👑</ThemedText>
              <ThemedText type="title" style={[styles.center, { color: theme.accent }]}>
                {bracket.find((m) => m.round === 2)?.winner_name ?? '—'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                성경 왕중왕
              </ThemedText>
            </View>
          )}

          {!userId && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              로그인하면 내 경기가 여기 보입니다.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: { marginBottom: Spacing.two },
  bigEmoji: { fontSize: 52, textAlign: 'center' },
  center: { textAlign: 'center' },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4, marginTop: Spacing.two },
  myMatchCard: { borderRadius: 12, padding: 14, gap: 4, marginTop: Spacing.two },
  prizeCard: { borderRadius: 12, borderWidth: 2, padding: 14, gap: 6, marginTop: Spacing.two },
  prizeRows: { marginTop: 4, gap: 2 },
  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prizeLabel: { width: 78 },
  prizeWho: { flex: 1, minWidth: 0 },
  line: { lineHeight: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roundBlock: { marginTop: Spacing.three, gap: Spacing.one },
  roundTitle: { marginBottom: 2 },
  matchCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sideName: { flex: 1, minWidth: 0 },
  matchFoot: { marginTop: 2, lineHeight: 18 },
  scoreCard: { borderRadius: 12, padding: 16, alignItems: 'center', gap: 4, marginTop: Spacing.two },
  champCard: { borderRadius: 12, padding: 20, alignItems: 'center', gap: 4, marginTop: Spacing.four },
  primaryButton: { borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: Spacing.two },
  onAccent: { color: '#fff' },
  pressed: { opacity: 0.7 },
});
