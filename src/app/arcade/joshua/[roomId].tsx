import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JoshuaGame } from '@/components/joshua/JoshuaGame';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ALLIANCE_GOAL,
  COUNTDOWN_MS,
  finishRoom,
  getRoomState,
  MAX_SCORE,
  POLL_MS,
  progressRoom,
  readyRoom,
  seedFrom,
  TOTAL_MS,
  WARS,
  type JoshuaState,
} from '@/lib/joshua';

/** 둘이 하는 여호수아의 전쟁 한 판. 대기실 → 함께 시작 → 싸움 → 결과.
 * 흐름은 방탈출 겨루기(arena/duel/[duelId].tsx)와 같다. → docs/arcade/README.md */
export default function JoshuaRoomScreen() {
  const theme = useTheme();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();

  const [state, setState] = useState<JoshuaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    const pull = async () => {
      const s = await getRoomState(roomId);
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
  }, [roomId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const handleProgress = useCallback(
    (stagesDone: number, total: number) => {
      if (roomId) void progressRoom(roomId, stagesDone, total);
    },
    [roomId]
  );

  const handleFinish = useCallback(
    async (total: number) => {
      if (!roomId || reported.current) return;
      reported.current = true;
      try {
        await finishRoom(roomId, total);
      } catch (e) {
        setError(e instanceof Error ? e.message : '결과를 보내지 못했습니다');
      }
      setState(await getRoomState(roomId));
    },
    [roomId]
  );

  async function copyCode(code: string) {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사가 안 되면 번호를 눈으로 읽어 주면 된다 */
    }
  }

  async function shareCode(code: string) {
    const message = `⚔️ 여호수아의 전쟁 같이 해요!\n데이빗바이블 → 아케이드 → 여호수아의 전쟁 → 초대 번호 ${code}`;
    try {
      await Share.share({ message });
    } catch {
      await copyCode(message);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!state) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="subtitle">없는 방입니다</ThemedText>
          <Pressable onPress={() => router.replace('/arcade/joshua' as Href)} hitSlop={12}>
            <ThemedText type="smallBold">← 처음으로</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const startMs = state.started_at ? new Date(state.started_at).getTime() : null;
  const beginAt = startMs != null ? startMs + COUNTDOWN_MS : null;
  const fighting = state.status === 'playing' && beginAt != null && now < beginAt + TOTAL_MS + 500 && !state.my_done;

  // ── 대기실 ──────────────────────────────────────────────────
  if (state.status === 'waiting') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Pressable onPress={() => router.replace('/arcade/joshua' as Href)} hitSlop={12} style={styles.backRow}>
              <ThemedText type="smallBold">← 그만두기</ThemedText>
            </Pressable>
            <ThemedText style={styles.bigEmoji}>⚔️</ThemedText>
            <ThemedText type="title" style={styles.center}>
              여호수아의 전쟁
            </ThemedText>

            {state.i_am_host && (
              <View style={[styles.codeCard, { backgroundColor: theme.accentSoft }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  친구에게 이 초대 번호를 보내 주세요
                </ThemedText>
                <ThemedText type="title" style={[styles.code, { color: theme.accent }]}>
                  {state.code}
                </ThemedText>
                <View style={styles.codeButtons}>
                  <Pressable
                    onPress={() => void shareCode(state.code)}
                    style={({ pressed }) => [styles.smallButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.onAccent}>
                      초대 보내기
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => void copyCode(state.code)}
                    style={({ pressed }) => [styles.smallButton, { borderColor: theme.border, borderWidth: 1 }, pressed && styles.pressed]}>
                    <ThemedText type="smallBold">{copied ? '복사됨 ✓' : '번호 복사'}</ThemedText>
                  </Pressable>
                </View>
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
                규칙
              </ThemedText>
              <ThemedText type="small" style={styles.line}>
                · 네 전쟁({WARS.map((w) => w.emoji).join(' ')})을 둘이 같은 순간에 같은 판으로 치릅니다.
              </ThemedText>
              <ThemedText type="small" style={styles.line}>
                · 한 전쟁 100점, 만점 {MAX_SCORE}점. 점수가 높은 쪽이 이깁니다.
              </ThemedText>
              <ThemedText type="small" style={styles.line}>
                · 둘의 점수를 합쳐 {ALLIANCE_GOAL}점을 넘기면 함께 가나안을 얻습니다.
              </ThemedText>
            </View>

            {!state.i_am_ready ? (
              <Pressable
                disabled={!state.opponent_joined}
                onPress={() => roomId && void readyRoom(roomId)}
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

  // ── 싸움 (카운트다운 포함) ───────────────────────────────────
  if (fighting && beginAt != null) {
    const oppNote = `${state.opponent_name ?? '상대'} · ${state.opponent_stage}/${WARS.length} 전쟁 · ${state.opponent_score}점`;
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.game}>
            <JoshuaGame
              seed={seedFrom(state.id)}
              startAt={beginAt}
              note={oppNote}
              onProgress={handleProgress}
              onFinish={handleFinish}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── 내가 끝냈고 상대를 기다리는 중 ──────────────────────────
  if (!state.opponent_done || !state.my_done) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText style={styles.bigEmoji}>🛡️</ThemedText>
            <ThemedText type="title" style={styles.center}>
              전쟁을 마쳤습니다
            </ThemedText>
            <View style={[styles.scoreCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="title" style={{ color: theme.accent }}>
                {state.my_score}점
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {state.opponent_name} 님이 끝내기를 기다리는 중…
              </ThemedText>
            </View>
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

  // ── 결과 ────────────────────────────────────────────────────
  const mine = state.my_score;
  const theirs = state.opponent_score;
  const sum = mine + theirs;
  const alliance = sum >= ALLIANCE_GOAL;
  const verdict = mine > theirs ? '내가 앞섰습니다' : mine < theirs ? '상대가 앞섰습니다' : '막상막하, 비겼습니다';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText style={styles.bigEmoji}>{alliance ? '🏆' : '⚔️'}</ThemedText>
          <ThemedText type="title" style={styles.center}>
            {alliance ? '연합 승리!' : '아직 가나안은 멀었습니다'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            합계 {sum}점 (목표 {ALLIANCE_GOAL}점) · {verdict}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.scoreRow}>
              <ThemedText type="smallBold" style={styles.who}>
                나
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                {mine}점
              </ThemedText>
            </View>
            <View style={styles.scoreRow}>
              <ThemedText type="smallBold" style={styles.who}>
                {state.opponent_name}
              </ThemedText>
              <ThemedText type="smallBold">{theirs}점</ThemedText>
            </View>
          </View>

          <Pressable
            onPress={() => router.replace('/arcade/joshua' as Href)}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.onAccent}>
              한 판 더
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/arcade' as Href)}
            style={({ pressed }) => [styles.secondaryButton, { borderColor: theme.border }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">아케이드로</ThemedText>
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
  game: { flex: 1, padding: Spacing.three, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: { marginBottom: Spacing.two },
  bigEmoji: { fontSize: 52, textAlign: 'center', marginTop: Spacing.two },
  center: { textAlign: 'center' },
  codeCard: { borderRadius: 12, padding: 16, alignItems: 'center', gap: 6, marginTop: Spacing.two },
  code: { letterSpacing: 8 },
  codeButtons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  smallButton: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center' },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: Spacing.two, gap: 6 },
  rulesCard: { borderRadius: 12, padding: 14, gap: 4, marginTop: Spacing.two },
  line: { lineHeight: 20 },
  scoreCard: { borderRadius: 12, padding: 16, alignItems: 'center', gap: 4, marginTop: Spacing.two },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  who: { flex: 1 },
  primaryButton: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.three },
  secondaryButton: { borderRadius: 999, borderWidth: 1, paddingVertical: 12, alignItems: 'center', marginTop: Spacing.two },
  onAccent: { color: '#fff' },
  loading: { marginTop: Spacing.three },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
