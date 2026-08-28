import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getMyProgress, MAX_ATTEMPTS, type RoomProgress } from '@/lib/arena/db';
import { DEFAULT_CLOSED_MESSAGE, getGateState, type GateState } from '@/lib/arena/gate';
import { ESCAPE_ROOMS } from '@/lib/arena/rooms';

const LEVEL_LABEL = ['', '쉬움', '보통', '어려움'];

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${String(s).padStart(2, '0')}초`;
}

export default function EscapeRoomListScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Map<string, RoomProgress>>(new Map());
  const [gate, setGate] = useState<GateState | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        // 로그인 없이도 방에 들어가 볼 수 있다. 기록 저장만 로그인이 필요하다 —
        // 통독도우미에서 배운 것: 여기서 그냥 돌아가 버리면 화면이 영원히 돈다.
        const [map, g] = await Promise.all([
          userId ? getMyProgress(userId) : Promise.resolve(new Map<string, RoomProgress>()),
          getGateState(),
        ]);
        if (cancelled) return;
        setProgress(map);
        setGate(g);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const cleared = [...progress.values()].filter((p) => p.everEscaped).length;
  const totalScore = [...progress.values()].reduce((n, p) => n + p.average, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">← 뒤로</ThemedText>
          </Pressable>

          <ThemedText type="title">🚪 성경 방탈출</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
            성경의 한 사건 안에 갇힙니다. 그 사건에 대한 자물쇠 셋을 차례로 열고 마지막
            문을 열어야 나옵니다. 남은 시간이 그대로 점수예요.
          </ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loading} />
          ) : gate && !gate.is_open ? (
            /* 문이 닫혀 있다 — 방 목록을 아예 보여 주지 않는다.
               제목만 봐도 어느 사건인지 알 수 있어서 그것만으로 미리 준비가 된다. */
            <View style={[styles.closedCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText style={styles.lockEmoji}>🔒</ThemedText>
              <ThemedText type="subtitle" style={styles.center}>
                아직 문이 열리지 않았습니다
              </ThemedText>
              <ThemedText type="small" style={[styles.center, styles.lead]}>
                {gate.closed_message || DEFAULT_CLOSED_MESSAGE}
              </ThemedText>
              {gate.next_open_from && (
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  {gate.next_tournament} · {gate.next_open_from} 부터
                </ThemedText>
              )}
              <ThemedText type="small" themeColor="textSecondary" style={[styles.center, styles.lead]}>
                모두 같은 날 같은 문제로 시작해야 겨루기가 됩니다. 그때까지 성경을
                읽어 두시면 그게 그대로 준비예요.
              </ThemedText>
            </View>
          ) : (
            <>
              {userId && (
                <View style={[styles.summaryCard, { backgroundColor: theme.accentSoft }]}>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    나온 방 {cleared} / {ESCAPE_ROOMS.length} · 합계 {totalScore}점
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    한 방에 {MAX_ATTEMPTS}번까지 들어갈 수 있고, 두 판의 평균이 그 방의 점수입니다.
                  </ThemedText>
                </View>
              )}

              {ESCAPE_ROOMS.map((room) => {
                const p = progress.get(room.id);
                const done = !!p?.everEscaped;
                return (
                  <Pressable
                    key={room.id}
                    onPress={() => router.push(`/arena/escape/${room.id}` as never)}
                    style={({ pressed }) => [
                      styles.roomCard,
                      { backgroundColor: theme.backgroundElement, borderColor: done ? theme.done : theme.border },
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.roomHead}>
                      <ThemedText style={styles.roomEmoji}>{room.emoji}</ThemedText>
                      <View style={styles.roomBody}>
                        <ThemedText type="smallBold">{room.title}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {room.passage} · {LEVEL_LABEL[room.level]} · 제한 {mmss(room.seconds)}
                        </ThemedText>
                      </View>
                      {done && <ThemedText style={styles.doneMark}>✓</ThemedText>}
                    </View>
                    {p ? (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.bestLine}>
                        {p.attempts
                          .map((a, i) => `${i + 1}차 ${a.escaped ? `${a.secondsLeft}점` : '실패'}`)
                          .join(' · ')}
                        {'  →  '}
                        {p.finished ? `최종 ${p.average}점` : `평균 ${p.average}점 (한 번 더 칠 수 있어요)`}
                      </ThemedText>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.bestLine}>
                        아직 들어가 보지 않은 방
                      </ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </>
          )}

          {/* 문이 닫혀 있을 때는 로그인 안내를 띄우지 않는다 — 「지금은 연습만
              됩니다」가 함께 보이면 들어갈 수 있다는 말로 읽힌다. */}
          {!userId && gate?.is_open !== false && (
            <Pressable
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [
                styles.loginCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">
                지금은 연습만 됩니다. 기록을 남기고 순위에 오르려면 로그인하세요. ›
              </ThemedText>
            </Pressable>
          )}
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
  loading: { marginTop: Spacing.three },
  summaryCard: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: Spacing.two },
  closedCard: { borderRadius: 12, padding: 20, gap: 8, alignItems: 'center', marginTop: Spacing.three },
  lockEmoji: { fontSize: 44 },
  center: { textAlign: 'center' },
  roomCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  roomHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomEmoji: { fontSize: 26, width: 34, textAlign: 'center' },
  roomBody: { flex: 1, minWidth: 0, gap: 2 },
  doneMark: { fontSize: 18 },
  bestLine: { lineHeight: 18 },
  loginCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: Spacing.two },
  pressed: { opacity: 0.7 },
});
