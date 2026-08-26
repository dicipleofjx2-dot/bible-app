import { useAudioPlayer } from 'expo-audio';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockPanel } from '@/components/arena/LockPanel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { HINT_PENALTY_SEC, WRONG_PENALTY_SEC, type EscapeRoom, type Lock } from '@/lib/arena/escapeTypes';

const unlockSound = require('@/assets/sounds/unlock.wav');
const wrongSound = require('@/assets/sounds/wrong-beep.wav');
const tickSound = require('@/assets/sounds/tick.wav');
const escapeSound = require('@/assets/sounds/escape.wav');

/** 방 하나를 실제로 푸는 부분. 시계·자물쇠·힌트·벌점·소리가 모두 여기 있다.
 *
 * **혼자 하는 판과 둘이 겨루는 판이 이 한 벌을 같이 쓴다.** 두 벌로 두면
 * 한쪽만 고치고 "고쳤는데 그대로다"가 반드시 생긴다. 겨루기에서 달라지는 것은
 * 위에 붙는 띠(상대 진행)와 끝난 뒤 무엇을 하느냐뿐이라 그 둘만 밖에서 받는다. */

export type RunResult = {
  escaped: boolean;
  secondsLeft: number;
  hintsUsed: number;
  wrongCount: number;
};

type Props = {
  room: EscapeRoom;
  /** 시계 위에 붙는 띠. 겨루기에서 상대가 어디까지 갔는지 보여 준다. */
  banner?: ReactNode;
  /** 자물쇠를 열 때마다 부른다. 0~3 은 남은 자물쇠 번호, 4 는 탈출. */
  onStep?: (step: number) => void;
  onFinish: (result: RunResult) => void;
  /** "1차" 처럼 시계 옆에 붙는 짧은 말 */
  sideLabel?: string;
  /** 나가기를 눌렀을 때. 없으면 나가기 단추가 안 보인다. */
  onQuit?: () => void;
  /** 겨루기에서 쓴다 — 둘의 시작 시각(ms). 주면 남은 시간을 여기서부터 잰다.
   *
   * 화면이 2초마다 상태를 물어보는 구조라 두 사람이 「시작됐다」를 아는 시점이
   * 최대 2초까지 어긋난다. 초 단위로 승부가 갈리는 놀이에서 그 2초는 크다.
   * 서버가 찍은 한 시각을 둘이 함께 보면 늦게 안 쪽도 손해가 없다. */
  startedAt?: number;
};

/** 이 초부터 초읽기 소리가 난다 */
const TICK_FROM_SEC = 10;

export function mmss(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function EscapeRun({ room, banner, onStep, onFinish, sideLabel, onQuit, startedAt }: Props) {
  const theme = useTheme();

  /** 0~2 는 자물쇠, 3 은 마지막 문 */
  const [step, setStep] = useState(0);
  // 겨루기면 서버가 찍은 시작 시각에서 이미 지난 만큼을 빼고 시작한다.
  const [secondsLeft, setSecondsLeft] = useState(() =>
    startedAt ? Math.max(0, Math.ceil((startedAt + room.seconds * 1000 - Date.now()) / 1000)) : room.seconds
  );
  const [opened, setOpened] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // ── 소리 ────────────────────────────────────────────────────
  // 재생기가 렌더마다 새 값으로 오면 시계 효과가 매번 다시 걸린다. 소리는
  // 부수적인 것이므로 시계가 그 정체성에 매달리게 두지 않는다(3초 OX 에서
  // 같은 함정을 겪었다 — src/app/reading-helper/speed-quiz.tsx).
  const unlockPlayer = useAudioPlayer(unlockSound);
  const wrongPlayer = useAudioPlayer(wrongSound);
  const tickPlayer = useAudioPlayer(tickSound);
  const escapePlayer = useAudioPlayer(escapeSound);
  const soundsRef = useRef({
    unlock: unlockPlayer,
    wrong: wrongPlayer,
    tick: tickPlayer,
    escape: escapePlayer,
  });
  soundsRef.current = { unlock: unlockPlayer, wrong: wrongPlayer, tick: tickPlayer, escape: escapePlayer };

  const play = useCallback((which: 'unlock' | 'wrong' | 'tick' | 'escape') => {
    try {
      const player = soundsRef.current[which];
      player.seekTo(0);
      player.play();
    } catch {
      // 소리가 안 나는 것으로 놀이가 멈추지는 않게 한다.
    }
  }, []);

  /** 이 국면의 시간이 다 되는 **절대 시각**.
   *
   * ⚠️ 되돌리지 말 것. 예전에는 `setInterval` 로 1초씩 뺐는데, **다른 탭으로
   * 옮기면 브라우저가 타이머를 멈춰서 시계가 그대로 섰다**(검증 중 1:43 에
   * 멈춘 채로 몇 분이 지났다). 휴대폰에서 앱을 내려도 같다. 상금이 걸린
   * 대회에서 「탭을 바꾸면 시간이 안 간다」는 반드시 발각되고 악용된다. */
  const deadlineRef = useRef<number | null>(null);
  /** 끝났다고 한 번 알린 뒤에는 다시 알리지 않는다 */
  const finished = useRef(false);

  // 시계는 자물쇠를 푸는 동안에만 간다. 열린 자물쇠의 해설을 읽는 동안에는
  // 멈춘다 — 읽느라 시간을 잃으면 다음부터 아무도 안 읽는다.
  useEffect(() => {
    if (opened || finished.current) {
      deadlineRef.current = null;
      return;
    }
    deadlineRef.current = Date.now() + secondsLeft * 1000;
    const id = setInterval(() => {
      const d = deadlineRef.current;
      if (d == null) return;
      setSecondsLeft(Math.max(0, Math.ceil((d - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(id);
    // secondsLeft 를 넣으면 매초 마감 시각을 새로 잡아 시계가 영영 안 준다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // 시간이 다 된 것은 여기 한 곳에서만 판정한다.
  useEffect(() => {
    if (secondsLeft > 0 || opened || finished.current) return;
    finished.current = true;
    onFinish({ escaped: false, secondsLeft: 0, hintsUsed, wrongCount });
  }, [secondsLeft, opened, hintsUsed, wrongCount, onFinish]);

  // 마지막 열 셈. 초가 바뀔 때 한 번씩만 울린다.
  const lastTickRef = useRef(-1);
  useEffect(() => {
    if (opened || secondsLeft > TICK_FROM_SEC || secondsLeft <= 0) return;
    if (lastTickRef.current === secondsLeft) return;
    lastTickRef.current = secondsLeft;
    play('tick');
  }, [secondsLeft, opened, play]);

  const currentLock: Lock = step < 3 ? room.locks[step] : room.finalLock;
  const isFinal = step === 3;

  function penalize(sec: number, message: string) {
    // 마감 시각과 화면의 남은 초를 같이 당긴다. 마감만 당기면 다음 눈금까지
    // 옛 숫자가 보이고, 화면만 당기면 다음 눈금에 되돌아온다.
    if (deadlineRef.current != null) deadlineRef.current -= sec * 1000;
    setSecondsLeft((s) => Math.max(0, s - sec));
    setFlash(message);
    setTimeout(() => setFlash(null), 1400);
  }

  function handleCorrect() {
    setHintOpen(false);
    setFlash(null);
    play('unlock');
    setOpened(true);
    onStep?.(step + 1);
  }

  function handleWrong() {
    setWrongCount((n) => n + 1);
    play('wrong');
    penalize(WRONG_PENALTY_SEC, `틀렸습니다 · ${WRONG_PENALTY_SEC}초 차감`);
  }

  function openHint() {
    if (hintOpen) return;
    setHintOpen(true);
    setHintsUsed((n) => n + 1);
    penalize(HINT_PENALTY_SEC, `힌트를 열었습니다 · ${HINT_PENALTY_SEC}초 차감`);
  }

  function nextStep() {
    if (isFinal) {
      if (finished.current) return;
      finished.current = true;
      play('escape');
      onFinish({ escaped: true, secondsLeft, hintsUsed, wrongCount });
      return;
    }
    setStep((s) => s + 1);
    setOpened(false);
  }

  // ── 자물쇠가 열린 뒤 (시계 멈춤) ────────────────────────────
  if (opened) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {banner}
            <View style={styles.timerRow}>
              <ThemedText type="subtitle" style={{ color: theme.accent }}>
                {mmss(secondsLeft)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                시계가 멈췄습니다
              </ThemedText>
            </View>

            <ThemedText style={styles.bigEmoji}>🔓</ThemedText>
            <ThemedText type="subtitle" style={styles.center}>
              {isFinal ? '문이 열렸습니다' : `${currentLock.fixture} 열림`}
            </ThemedText>

            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="small" style={styles.bodyText}>
                {currentLock.reveal}
              </ThemedText>
            </View>

            <Pressable
              onPress={nextStep}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.onAccent}>
                {isFinal ? '밖으로 나가기' : '다음 자물쇠로'}
              </ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── 자물쇠를 푸는 중 ────────────────────────────────────────
  const low = secondsLeft <= 30;
  const ratio = Math.max(0, Math.min(1, secondsLeft / room.seconds));
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {banner}

          <View style={styles.timerRow}>
            <ThemedText type="title" style={{ color: low ? '#C0392B' : theme.accent }}>
              {mmss(secondsLeft)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isFinal ? '마지막 문' : `자물쇠 ${step + 1} / 3`}
              {sideLabel ? ` · ${sideLabel}` : ''}
            </ThemedText>
          </View>

          {/* 남은 시간 막대. 숫자만 있으면 얼마나 급한지 한눈에 안 들어온다. */}
          <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
            <View
              style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: low ? '#C0392B' : theme.accent }]}
            />
          </View>

          {flash && (
            <View style={[styles.flash, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                {flash}
              </ThemedText>
            </View>
          )}

          <ThemedText type="small" themeColor="textSecondary">
            {room.title} · {currentLock.fixture}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.question}>
            {currentLock.question}
          </ThemedText>

          <LockPanel key={currentLock.id} lock={currentLock} onCorrect={handleCorrect} onWrong={handleWrong} />

          {hintOpen ? (
            <View style={[styles.hintCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="small" style={styles.bodyText}>
                💡 {currentLock.hint}
              </ThemedText>
            </View>
          ) : (
            <Pressable
              onPress={openHint}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" themeColor="textSecondary">
                힌트 보기 (−{HINT_PENALTY_SEC}초)
              </ThemedText>
            </Pressable>
          )}

          {onQuit && (
            <Pressable onPress={onQuit} hitSlop={12} style={styles.giveUp}>
              <ThemedText type="small" themeColor="textSecondary">
                나가기 (기록이 남지 않습니다)
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
  bigEmoji: { fontSize: 52, textAlign: 'center', marginTop: Spacing.two },
  center: { textAlign: 'center' },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: Spacing.two, gap: 4 },
  bodyText: { lineHeight: 21 },
  primaryButton: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.three },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  onAccent: { color: '#fff' },
  timerRow: { alignItems: 'center', gap: 2 },
  barTrack: { height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 2 },
  barFill: { height: '100%', borderRadius: 999 },
  flash: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  question: { lineHeight: 26 },
  hintCard: { borderRadius: 10, padding: 12, marginTop: Spacing.two },
  giveUp: { alignItems: 'center', marginTop: Spacing.four, paddingVertical: 8 },
  pressed: { opacity: 0.7 },
});
