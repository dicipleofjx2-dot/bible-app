import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getStepsByDate, saveSteps, STEP_GOAL } from '@/lib/readingHelper/db';
import {
  askPedometerPermission,
  pedometerAvailable,
  pedometerKind,
  readTodaySteps,
  watchSteps,
} from '@/lib/pedometer';

/** 요 며칠. 일곱 칸이면 한 주가 한눈에 들어오고, 더 늘리면 막대가 가늘어진다. */
const DAYS = 7;

function dayKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 「2026-10-20」→「20일」 */
function dayLabel(key: string): string {
  return `${Number(key.slice(8, 10))}`;
}

/**
 * 만보기.
 *
 * 걸음은 기기가 세 주고(→ `lib/pedometer`), 이 화면은 그것을 **하루 한 줄로
 * 쌓아** 서버에 남긴다. 기기를 바꿔도 지난 기록이 남는 까닭이다.
 *
 * 적히는 수가 어디서 온 것인지 숨기지 않는다. 안드로이드에서는 앱을 켠 동안만
 * 셀 수 있는데, 그 사정을 적어 두지 않으면 「만보기가 고장 났다」가 된다.
 */
export default function PedometerScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const kind = pedometerKind();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [granted, setGranted] = useState(false);
  /** 서버에 적혀 있던 오늘 걸음. 안드로이드는 여기에 이번에 걸은 만큼을 더한다. */
  const [base, setBase] = useState(0);
  /** 이 화면을 연 뒤로 걸은 수(안드로이드). */
  const [live, setLive] = useState(0);
  const [history, setHistory] = useState<Map<string, number>>(new Map());
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);

  // 통독의 「오늘」은 새벽 4시에 바뀌지만(DAY_START_HOUR), 걸음 수는 기기가
  // 자정에 0 으로 되돌린다. 기기와 같은 자정을 쓴다 — 안 그러면 새벽 1시에 걸은
  // 걸음이 어제 칸에 붙는다.
  const today = dayKey(0);
  const steps = base + live;
  const reached = steps >= STEP_GOAL;
  /** 저장한 값을 또 저장하지 않으려고 들고 있는다. */
  const savedRef = useRef(0);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    const map = await getStepsByDate(userId, dayKey(DAYS - 1), today);
    setHistory(map);
    setBase(map.get(today) ?? 0);
    savedRef.current = map.get(today) ?? 0;
  }, [userId, today]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // 센서가 있는지, 써도 되는지. 거절당하면 손으로 적는 길로 간다.
  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await pedometerAvailable();
      if (!alive) return;
      setAvailable(ok);
      if (!ok) return;
      const allowed = await askPedometerPermission();
      if (alive) setGranted(allowed);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** 오늘 수를 서버에 남긴다. 큰 쪽만 남으므로 자주 불러도 괜찮다. */
  const push = useCallback(
    async (n: number) => {
      if (!userId || n <= savedRef.current) return;
      savedRef.current = n;
      const kept = await saveSteps(userId, today, n);
      setHistory((cur) => new Map(cur).set(today, kept));
    },
    [userId, today],
  );

  // 아이폰 — 운영체제에 오늘치를 통째로 묻는다. 화면에 들어올 때마다 새로 묻는다.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (kind === 'day' && granted) {
        void (async () => {
          const n = await readTodaySteps();
          if (alive && n !== null) {
            setBase(n);
            await push(n);
          }
        })();
      }
      return () => {
        alive = false;
      };
    }, [kind, granted, push]),
  );

  // 안드로이드 — 화면을 보는 동안 센다. 30초마다, 그리고 떠날 때 한 번 남긴다.
  useFocusEffect(
    useCallback(() => {
      if (kind !== 'live' || !granted) return;
      let sinceStart = 0;
      const stop = watchSteps((n) => {
        sinceStart = n;
        setLive(n);
      });
      const timer = setInterval(() => void push(base + sinceStart), 30000);
      return () => {
        stop();
        clearInterval(timer);
        void push(base + sinceStart);
      };
    }, [kind, granted, base, push]),
  );

  async function addByHand() {
    const n = Number(typed.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    try {
      await push(n);
      setBase(n);
      setTyped('');
    } finally {
      setSaving(false);
    }
  }

  const days = Array.from({ length: DAYS }, (_, i) => dayKey(DAYS - 1 - i));
  const most = Math.max(STEP_GOAL, ...days.map((d) => history.get(d) ?? 0));

  // 고리 — 둘레를 걸음 비율만큼 칠한다.
  const R = 68;
  const C = 2 * Math.PI * R;
  const done = Math.min(1, steps / STEP_GOAL);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {!userId ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              걸음을 남기려면 로그인이 필요해요. 마이페이지에서 로그인해 주세요.
            </ThemedText>
          ) : null}

          <View style={styles.ringWrap}>
            <Svg width={168} height={168}>
              <Circle cx={84} cy={84} r={R} stroke={theme.backgroundElement} strokeWidth={14} fill="none" />
              {done > 0 ? (
              <Circle
                cx={84}
                cy={84}
                r={R}
                stroke={reached ? theme.done : theme.accent}
                strokeWidth={14}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${C * done} ${C}`}
                // 12시 방향에서 시작해 시계 방향으로 찬다.
                transform="rotate(-90 84 84)"
              />
              ) : null}
            </Svg>
            <View style={styles.ringCenter}>
              <ThemedText style={styles.bigNumber}>{steps.toLocaleString()}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                / {STEP_GOAL.toLocaleString()} 걸음
              </ThemedText>
            </View>
          </View>

          {reached ? (
            <ThemedText type="smallBold" style={[styles.note, { color: theme.done }]}>
              🎉 오늘 만 걸음을 채웠습니다
            </ThemedText>
          ) : null}

          {/* 수가 어디서 온 것인지 적는다 — 이것이 없으면 고장으로 오해한다. */}
          {!userId ? null : available === false ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              이 기기에서는 걸음을 셀 수 없어요. 아래에 직접 적어 주세요.
            </ThemedText>
          ) : kind === 'live' ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              안드로이드는 앱을 켜 둔 동안 걸은 걸음을 셉니다. 걷는 동안 이 화면을 열어 두면 그만큼 쌓여요.
            </ThemedText>
          ) : kind === 'day' ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              아이폰이 하루 종일 센 걸음을 그대로 가져옵니다.
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              웹에서는 걸음을 셀 수 없어요. 휴대폰에 깔린 앱에서 열면 저절로 세어져요.
            </ThemedText>
          )}

          {available !== false && kind !== 'manual' && !granted ? (
            <Pressable
              onPress={() => void askPedometerPermission().then(setGranted)}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                걸음 세기를 허락하기
              </ThemedText>
            </Pressable>
          ) : null}

          <ThemedText type="smallBold" style={styles.sectionTitle}>
            요 일주일
          </ThemedText>
          <View style={styles.chart}>
            {days.map((d) => {
              const n = d === today ? steps : history.get(d) ?? 0;
              return (
                <View key={d} style={styles.bar}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.round((Math.min(n, most) / most) * 100)}%`,
                          backgroundColor: n >= STEP_GOAL ? theme.done : theme.accent,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.barLabel}>
                    {dayLabel(d)}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          {/* 손으로 적기 — 휴대폰을 두고 걸은 날도 있고, 웹에서는 이것뿐이다. */}
          {kind !== 'day' && userId ? (
            <View style={styles.handRow}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                keyboardType="number-pad"
                placeholder="오늘 걸음 직접 적기"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              />
              <Pressable
                onPress={() => void addByHand()}
                disabled={saving}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  적기
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {userId ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              적힌 것보다 작은 수는 덮어쓰지 않아요 — 하루 치가 거꾸로 줄어들지 않게요.
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginTop: Spacing.three },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  bigNumber: { fontSize: 34, fontWeight: '800', lineHeight: 40 },
  note: { textAlign: 'center' },
  sectionTitle: { marginTop: Spacing.four },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, height: 140 },
  bar: { flex: 1, alignItems: 'center', gap: Spacing.one },
  barTrack: { width: '100%', height: 110, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6, minHeight: 3 },
  barLabel: { fontSize: 11 },
  handRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff' },
  pressed: { opacity: 0.7 },
});
