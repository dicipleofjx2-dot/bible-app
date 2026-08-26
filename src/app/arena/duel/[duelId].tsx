import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EscapeRun, mmss, type RunResult } from '@/components/arena/EscapeRun';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  finishDuel,
  getDuelState,
  judge,
  POLL_MS,
  readyDuel,
  stepDuel,
  stepLabel,
  type DuelState,
} from '@/lib/arena/duel';
import { findRoom } from '@/lib/arena/rooms';

/** 둘이 겨루는 한 판. 대기실 → 함께 시작 → 겨루기 → 승패.
 * 실제로 방을 푸는 부분은 혼자 칠 때와 같은 EscapeRun 이다.
 * → docs/arena/README.md */

/** 둘 다 준비한 뒤 이만큼 세고 시작한다. 화면이 2초마다 상태를 물어보므로
 * 그보다 길어야 둘 다 「시작」을 같은 순간에 본다. */
const COUNTDOWN_MS = 3000;

export default function DuelScreen() {
  const theme = useTheme();
  const { duelId } = useLocalSearchParams<{ duelId: string }>();

  const [state, setState] = useState<DuelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [myResult, setMyResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 상태를 2초마다 다시 물어본다. Realtime 을 안 쓰는 이유는 0061 에 적었다.
  useEffect(() => {
    if (!duelId) return;
    let cancelled = false;
    const pull = async () => {
      const s = await getDuelState(duelId);
      if (cancelled) return;
      setState(s);
      setLoading(false);
    };
    void pull();
    const id = setInterval(pull, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [duelId]);

  // 세는 동안 화면이 1초마다 다시 그려져야 숫자가 바뀐다.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const room = state ? findRoom(state.room_id) : undefined;

  const handleStep = useCallback(
    (step: number) => {
      if (duelId) void stepDuel(duelId, step);
    },
    [duelId]
  );

  // 끝났다고 두 번 알리지 않는다.
  const reported = useRef(false);
  const handleFinish = useCallback(
    async (r: RunResult) => {
      setMyResult(r);
      if (!duelId || reported.current) return;
      reported.current = true;
      try {
        await finishDuel(duelId, r.escaped, r.secondsLeft);
      } catch (e) {
        setError(e instanceof Error ? e.message : '결과를 보내지 못했습니다');
      }
      const s = await getDuelState(duelId);
      setState(s);
    },
    [duelId]
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

  if (!state || !room) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="subtitle">없는 대결입니다</ThemedText>
          <Pressable onPress={() => router.replace('/arena/duel' as Href)} hitSlop={12}>
            <ThemedText type="smallBold">← 대결 화면으로</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const startMs = state.started_at ? new Date(state.started_at).getTime() : null;
  const beginAt = startMs != null ? startMs + COUNTDOWN_MS : null;
  const counting = state.status === 'playing' && beginAt != null && now < beginAt;
  const running = state.status === 'playing' && beginAt != null && now >= beginAt;

  // ── 대기실 ──────────────────────────────────────────────────
  if (state.status === 'waiting') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Pressable onPress={() => router.replace('/arena/duel' as Href)} hitSlop={12} style={styles.backRow}>
              <ThemedText type="smallBold">← 그만두기</ThemedText>
            </Pressable>

            <ThemedText style={styles.bigEmoji}>{room.emoji}</ThemedText>
            <ThemedText type="title" style={styles.center}>
              {room.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {room.passage} · 제한 {mmss(room.seconds)}
            </ThemedText>

            {state.i_am_host && (
              <View style={[styles.codeCard, { backgroundColor: theme.accentSoft }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  상대에게 이 번호를 알려 주세요
                </ThemedText>
                <ThemedText type="title" style={[styles.code, { color: theme.accent }]}>
                  {state.code}
                </ThemedText>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="smallBold">
                {state.opponent_joined ? `상대: ${state.opponent_name}` : '상대를 기다리는 중…'}
              </ThemedText>
              {state.opponent_joined && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                  {state.opponent_ready ? '상대가 준비했습니다' : '상대가 아직 준비하지 않았습니다'}
                </ThemedText>
              )}
              {state.i_am_ready && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                  나는 준비했습니다. 둘 다 준비하면 함께 시작합니다.
                </ThemedText>
              )}
            </View>

            <View style={[styles.rulesCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                겨루기 규칙
              </ThemedText>
              <ThemedText type="small" style={styles.line}>
                · 둘이 같은 방에 동시에 들어갑니다. 먼저 나온 사람이 이깁니다.
              </ThemedText>
              <ThemedText type="small" style={styles.line}>
                · 둘 다 나오면 시간을 더 남긴 쪽이, 둘 다 못 나오면 자물쇠를 더 많이 연
                쪽이 이깁니다.
              </ThemedText>
              <ThemedText type="small" style={styles.line}>
                · 겨루기 판은 개인 기록(두 판 평균)에 들어가지 않습니다.
              </ThemedText>
            </View>

            {!state.i_am_ready ? (
              <Pressable
                disabled={!state.opponent_joined}
                onPress={() => duelId && void readyDuel(duelId)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected },
                  !state.opponent_joined && styles.dim,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.onAccent}>
                  {state.opponent_joined ? '준비 완료' : '상대를 기다리는 중…'}
                </ThemedText>
              </Pressable>
            ) : (
              <ActivityIndicator style={styles.loading} />
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── 셋 · 둘 · 하나 ──────────────────────────────────────────
  if (counting && beginAt != null) {
    const left = Math.ceil((beginAt - now) / 1000);
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="small" themeColor="textSecondary">
            {state.opponent_name} 님과 겨룹니다
          </ThemedText>
          <ThemedText style={styles.countdown}>{left}</ThemedText>
          <ThemedText type="subtitle">{room.title}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const verdict = judge(state);

  // ── 겨루는 중 ───────────────────────────────────────────────
  if (running && !myResult) {
    const banner = (
      <View style={[styles.banner, { backgroundColor: theme.accentSoft }]}>
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          {state.opponent_name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {state.opponent_escaped == null ? stepLabel(state.opponent_step) : '이미 나갔습니다'}
        </ThemedText>
      </View>
    );
    return (
      <EscapeRun
        room={room}
        banner={banner}
        startedAt={beginAt ?? undefined}
        sideLabel="겨루기"
        onStep={handleStep}
        onFinish={handleFinish}
      />
    );
  }

  // ── 내가 끝냈고 상대를 기다리는 중 ──────────────────────────
  if (verdict === 'waiting') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText style={styles.bigEmoji}>{myResult?.escaped ? '🎉' : '⏰'}</ThemedText>
            <ThemedText type="title" style={styles.center}>
              {myResult?.escaped ? '나왔습니다!' : '시간이 다 되었습니다'}
            </ThemedText>
            <View style={[styles.scoreCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="title" style={{ color: theme.accent }}>
                {myResult?.escaped ? myResult.secondsLeft : 0}점
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {state.opponent_name} 님이 끝내기를 기다리는 중…
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              상대는 지금 {stepLabel(state.opponent_step)}
            </ThemedText>
            <ActivityIndicator style={styles.loading} />
            {error && (
              <ThemedText type="small" style={[styles.center, { color: theme.accent }]}>
                {error}
              </ThemedText>
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── 승패 ────────────────────────────────────────────────────
  const emoji = verdict === 'win' ? '🏆' : verdict === 'lose' ? '😢' : '🤝';
  const title = verdict === 'win' ? '이겼습니다!' : verdict === 'lose' ? '졌습니다' : '비겼습니다';
  const mine = state.my_escaped ? (state.my_seconds_left ?? 0) : 0;
  const theirs = state.opponent_escaped ? (state.opponent_seconds_left ?? 0) : 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText style={styles.bigEmoji}>{emoji}</ThemedText>
          <ThemedText type="title" style={styles.center}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {room.title}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.scoreRow}>
              <ThemedText type="smallBold" style={styles.who}>
                나
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.detail}>
                {state.my_escaped ? `${mmss(mine)} 남기고 탈출` : `탈출 실패 · ${stepLabel(state.my_step)}까지`}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                {mine}점
              </ThemedText>
            </View>
            <View style={styles.scoreRow}>
              <ThemedText type="smallBold" style={styles.who}>
                {state.opponent_name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.detail}>
                {state.opponent_escaped
                  ? `${mmss(theirs)} 남기고 탈출`
                  : `탈출 실패 · ${stepLabel(state.opponent_step)}까지`}
              </ThemedText>
              <ThemedText type="smallBold">{theirs}점</ThemedText>
            </View>
          </View>

          <Pressable
            onPress={() => router.replace('/arena/duel' as Href)}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.onAccent}>
              한 판 더
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/arena' as Href)}
            style={({ pressed }) => [styles.secondaryButton, { borderColor: theme.border }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">대전 화면으로</ThemedText>
          </Pressable>
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
  bigEmoji: { fontSize: 52, textAlign: 'center', marginTop: Spacing.two },
  countdown: { fontSize: 80, lineHeight: 96, textAlign: 'center' },
  center: { textAlign: 'center' },
  codeCard: { borderRadius: 12, padding: 16, alignItems: 'center', gap: 4, marginTop: Spacing.two },
  code: { letterSpacing: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: Spacing.two, gap: 6 },
  rulesCard: { borderRadius: 12, padding: 14, gap: 4, marginTop: Spacing.two },
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
  scoreCard: { borderRadius: 12, padding: 16, alignItems: 'center', gap: 4, marginTop: Spacing.two },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  who: { width: 76 },
  detail: { flex: 1, minWidth: 0 },
  primaryButton: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.three },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  onAccent: { color: '#fff' },
  loading: { marginTop: Spacing.three },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
