import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EscapeRun, mmss, type RunResult } from '@/components/arena/EscapeRun';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  getRoomProgress,
  getRoomRanking,
  MAX_ATTEMPTS,
  saveEscapeResult,
  summarize,
  type EscapeRankRow,
  type RoomProgress,
} from '@/lib/arena/db';
import { HINT_PENALTY_SEC, WRONG_PENALTY_SEC } from '@/lib/arena/escapeTypes';
import { DEFAULT_CLOSED_MESSAGE, getGateState, type GateState } from '@/lib/arena/gate';
import { randomSeed } from '@/lib/arena/draw';
import { findRoom } from '@/lib/arena/rooms';

/** 혼자 치는 방탈출. 들어가기 전 안내와 끝난 뒤 결과만 여기 있고,
 * 실제로 푸는 부분은 EscapeRun 이 한다(겨루기와 같은 한 벌).
 * → docs/arena/README.md */

type Phase = 'loading' | 'intro' | 'playing' | 'result';

export default function EscapeRoomScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const room = findRoom(roomId ?? '');

  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState<RoomProgress | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [ranking, setRanking] = useState<EscapeRankRow[]>([]);
  const [gate, setGate] = useState<GateState | null>(null);
  /** EscapeRun 을 새로 시작시키기 위한 열쇠. 바뀌면 처음부터 다시 그려진다.
   * 씨앗도 함께 새로 만들어 1차와 2차가 **다른 문제**를 만나게 한다. */
  const [runKey, setRunKey] = useState(0);
  const [seed, setSeed] = useState(() => randomSeed());

  // 문이 열렸는지, 몇 번째 판인지 먼저 알아야 들어갈 수 있다.
  // 목록에서만 막으면 주소를 직접 쳐서 들어올 수 있다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 로그인 없이도 들어가 볼 수 있다. 그때는 기록이 없으니 늘 1차다.
      const [p, g] = await Promise.all([
        userId && room ? getRoomProgress(userId, room.id) : Promise.resolve(null),
        getGateState(),
      ]);
      if (cancelled) return;
      setProgress(p);
      setGate(g);
      setPhase('intro');
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, room]);

  const handleFinish = useCallback(
    async (r: RunResult) => {
      setResult(r);
      setPhase('result');
      if (!room) return;
      if (userId) {
        try {
          await saveEscapeResult(userId, {
            roomId: room.id,
            escaped: r.escaped,
            secondsLeft: r.secondsLeft,
            hintsUsed: r.hintsUsed,
            wrongCount: r.wrongCount,
          });
        } catch {
          // 기록을 못 남겨도 방을 나온 기쁨까지 막지는 않는다. 순위표에만 빠진다.
        }
        // 방금 친 판을 더해 평균을 다시 낸다 — 다시 불러오지 않아도 화면이 맞다.
        setProgress((prev) =>
          summarize(room.id, [
            ...(prev?.attempts ?? []),
            { secondsLeft: r.escaped ? r.secondsLeft : 0, escaped: r.escaped },
          ])
        );
      }
      setRanking(await getRoomRanking(room.id, 5));
    },
    [room, userId]
  );

  if (!room) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="subtitle">없는 방입니다</ThemedText>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText type="smallBold">← 뒤로</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (phase === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  // 문이 닫혀 있으면 방 안내조차 보여 주지 않는다 — 소개 글만 봐도 어느
  // 사건인지 알 수 있어서 그것만으로 미리 준비가 된다.
  if (gate && !gate.is_open) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
              <ThemedText type="smallBold">← 뒤로</ThemedText>
            </Pressable>
            <ThemedText style={styles.bigEmoji}>🔒</ThemedText>
            <ThemedText type="title" style={styles.center}>
              아직 문이 열리지 않았습니다
            </ThemedText>
            <View style={[styles.rulesCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="small" style={styles.line}>
                {gate.closed_message || DEFAULT_CLOSED_MESSAGE}
              </ThemedText>
              {gate.next_open_from && (
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  {gate.next_tournament} · {gate.next_open_from} 부터
                </ThemedText>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  /** 이번이 몇 번째 판인가 (1 또는 2). 기록이 없으면 1차. */
  const attemptNo = (progress?.attempts.length ?? 0) + 1;

  if (phase === 'playing') {
    return (
      <EscapeRun
        key={runKey}
        room={room}
        seed={seed}
        sideLabel={userId ? `${attemptNo}차` : '연습'}
        onFinish={handleFinish}
        onQuit={() => router.back()}
      />
    );
  }

  // ── 끝난 뒤 ─────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const thisScore = result.escaped ? result.secondsLeft : 0;
    // 방금 친 판까지 더해진 상태다.
    const canPlayAgain = !!userId && !!progress && !progress.finished;
    const allDone = !!userId && !!progress && progress.finished;
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText style={styles.bigEmoji}>{result.escaped ? '🎉' : '⏰'}</ThemedText>
            <ThemedText type="title" style={styles.center}>
              {result.escaped ? '탈출!' : '시간이 다 되었습니다'}
            </ThemedText>

            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="small" style={styles.bodyText}>
                {result.escaped ? room.outro : '자물쇠 앞에서 시간이 멈췄습니다.'}
              </ThemedText>
            </View>

            <View style={[styles.scoreCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="title" style={{ color: theme.accent }}>
                {thisScore}점
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {result.escaped ? `${mmss(result.secondsLeft)} 남기고 나왔습니다` : '탈출 실패'} · 힌트{' '}
                {result.hintsUsed}번 · 오답 {result.wrongCount}번
              </ThemedText>
            </View>

            {progress && progress.attempts.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                {progress.attempts.map((a, i) => (
                  <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.line}>
                    {i + 1}차 — {a.escaped ? `${a.secondsLeft}점` : '탈출 실패 (0점)'}
                  </ThemedText>
                ))}
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  {allDone ? '최종 점수' : '지금까지 평균'} {progress.average}점
                </ThemedText>
                {canPlayAgain && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                    한 번 더 칠 수 있습니다. 두 판의 평균이 이 방의 점수가 됩니다.
                  </ThemedText>
                )}
              </View>
            )}

            {ranking.length > 0 && (
              <>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  이 방의 기록 (두 판 평균)
                </ThemedText>
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
                        {r.seconds_left}점
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* 로그인 안 한 연습판은 기록이 없으므로 몇 번이든 다시 칠 수 있다 */}
            {(canPlayAgain || !userId) && (
              <Pressable
                onPress={() => {
                  setRunKey((k) => k + 1);
                  setSeed(randomSeed());
                  setResult(null);
                  setRanking([]);
                  setPhase('playing');
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.onAccent}>
                  {userId ? '2차 도전하기' : '다시 해 보기 (연습)'}
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.replace('/arena/escape' as Href)}
              style={({ pressed }) => [styles.secondaryButton, { borderColor: theme.border }, pressed && styles.pressed]}>
              <ThemedText type="smallBold">다른 방으로</ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── 들어가기 전 ─────────────────────────────────────────────
  const noAttemptsLeft = !!progress?.finished;
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">← 뒤로</ThemedText>
          </Pressable>

          <ThemedText style={styles.bigEmoji}>{room.emoji}</ThemedText>
          <ThemedText type="title" style={styles.center}>
            {room.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {room.passage}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="small" style={styles.bodyText}>
              {room.intro}
            </ThemedText>
          </View>

          <View style={[styles.rulesCard, { backgroundColor: theme.accentSoft }]}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              규칙
            </ThemedText>
            <ThemedText type="small" style={styles.line}>
              · 제한 시간 {mmss(room.seconds)}. 남은 시간이 그대로 점수입니다.
            </ThemedText>
            <ThemedText type="small" style={styles.line}>
              · 자물쇠 셋을 차례로 열고 마지막 문을 엽니다.
            </ThemedText>
            <ThemedText type="small" style={styles.line}>
              · 틀리면 {WRONG_PENALTY_SEC}초, 힌트를 열면 {HINT_PENALTY_SEC}초가 깎입니다.
            </ThemedText>
            <ThemedText type="small" style={styles.line}>
              · 한 방에 {MAX_ATTEMPTS}번까지 들어갈 수 있고, 두 판의 평균이 점수가 됩니다.
            </ThemedText>
          </View>

          {progress && progress.attempts.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="smallBold">지금까지</ThemedText>
              {progress.attempts.map((a, i) => (
                <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.line}>
                  {i + 1}차 — {a.escaped ? `${a.secondsLeft}점` : '탈출 실패 (0점)'}
                </ThemedText>
              ))}
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                평균 {progress.average}점
              </ThemedText>
            </View>
          )}

          {noAttemptsLeft ? (
            <>
              <View style={[styles.rulesCard, { backgroundColor: theme.accentSoft }]}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  이 방은 두 번 다 치셨습니다
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                  최종 점수는 평균 {progress?.average}점입니다. 다른 방으로 가 보세요.
                </ThemedText>
              </View>
              <Pressable
                onPress={() => router.replace('/arena/escape' as Href)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.onAccent}>
                  다른 방으로
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => setPhase('playing')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.onAccent}>
                {userId ? `${attemptNo}차 도전 시작 (${attemptNo}/${MAX_ATTEMPTS})` : '들어가기 (연습)'}
              </ThemedText>
            </Pressable>
          )}

          {!userId && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              로그인하지 않으면 기록이 남지 않습니다. 연습으로 몇 번이든 들어갈 수 있어요.
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
  bigEmoji: { fontSize: 52, textAlign: 'center', marginTop: Spacing.two },
  center: { textAlign: 'center' },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: Spacing.two, gap: 4 },
  bodyText: { lineHeight: 21 },
  line: { lineHeight: 20 },
  rulesCard: { borderRadius: 12, padding: 14, gap: 4, marginTop: Spacing.two },
  primaryButton: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.three },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  onAccent: { color: '#fff' },
  scoreCard: { borderRadius: 12, padding: 16, alignItems: 'center', gap: 4, marginTop: Spacing.two },
  sectionTitle: { marginTop: Spacing.four },
  rankCard: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rankNum: { width: 22 },
  rankName: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
});
