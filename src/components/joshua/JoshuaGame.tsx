import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sfx } from '@/lib/joshuaSound';
import {
  INTRO_MS,
  mulberry32,
  TOTAL_MS,
  WAR_MS,
  WAR_SLOT_MS,
  WARS,
} from '@/lib/joshua';

/** 여호수아의 전쟁 네 판. → docs/arcade/README.md
 *
 * 전체가 **시계 하나**로 돈다. 시작 시각(startAt)만 같으면 두 사람의 화면이
 * 같은 순간에 같은 전쟁을 연다 — 서로 신호를 주고받지 않아도 박자가 맞는다.
 * 한 전쟁은 안내 3초 + 싸움 24초이고, 일찍 끝내도 24초가 찰 때까지 기다린다.
 * 문제(막대 위치·신호 차례·왕이 나올 구멍)는 씨앗에서 뽑으므로 둘이 똑같다. */

type StageProps = {
  seed: number;
  /** 싸움이 시작된 뒤 흐른 시간(ms). */
  elapsed: number;
  onScore: (score: number) => void;
};

export function JoshuaGame({
  seed,
  startAt,
  note,
  onProgress,
  onFinish,
}: {
  seed: number;
  startAt: number;
  /** 상대 진행 같은 한 줄 알림. */
  note?: string;
  /** 한 전쟁을 마칠 때마다: (마친 전쟁 수, 지금까지 합계). */
  onProgress?: (stagesDone: number, total: number) => void;
  /** 네 전쟁이 다 끝났을 때 한 번: 합계. */
  onFinish: (total: number) => void;
}) {
  const theme = useTheme();
  const [now, setNow] = useState(Date.now());
  const scores = useRef<number[]>(WARS.map(() => 0));
  const doneStages = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, []);

  const total = () => scores.current.reduce((a, b) => a + b, 0);

  const t = now - startAt;
  const stage = t < 0 ? 0 : Math.min(Math.floor(t / WAR_SLOT_MS), WARS.length);
  const within = t < 0 ? 0 : t - stage * WAR_SLOT_MS;

  // 전쟁이 하나 끝날 때마다 알린다(건너뛴 프레임이 있어도 빠짐없이).
  useEffect(() => {
    while (doneStages.current < Math.min(stage, WARS.length)) {
      doneStages.current += 1;
      onProgress?.(doneStages.current, total());
    }
    if (stage >= WARS.length && !finished.current) {
      finished.current = true;
      onFinish(total());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // 소리: 단계가 바뀌는 순간마다 한 번. (훅이라 아래 early return 보다 위에 있어야 한다)
  const [muted, setMuted] = useState(false);
  const phaseKey =
    t < 0
      ? `c${Math.ceil(-t / 1000)}`
      : stage >= WARS.length
        ? 'end'
        : `s${stage}${within < INTRO_MS ? 'i' : 'p'}`;
  useEffect(() => {
    if (phaseKey[0] === 'c') {
      sfx.beep(phaseKey === 'c1');
    } else if (phaseKey === 'end') {
      sfx.stopDrone();
      sfx.stageEnd();
      sfx.victory();
    } else if (phaseKey.endsWith('i')) {
      if (phaseKey !== 's0i') sfx.stageEnd();
      sfx.shofar();
      sfx.startDrone();
    } else {
      sfx.go();
    }
  }, [phaseKey]);
  useEffect(() => () => sfx.stopDrone(), []);

  const setScore = useCallback(
    (i: number) => (s: number) => {
      scores.current[i] = Math.max(0, Math.min(100, Math.round(s)));
    },
    []
  );

  if (t < 0) {
    return (
      <View style={styles.center}>
        <ThemedText type="subtitle">전쟁 준비</ThemedText>
        <ThemedText type="title" style={{ color: theme.accent }}>
          {Math.ceil(-t / 1000)}
        </ThemedText>
      </View>
    );
  }

  if (stage >= WARS.length) {
    return (
      <View style={styles.center}>
        <ThemedText type="subtitle">전쟁 끝</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          결과를 모으는 중…
        </ThemedText>
      </View>
    );
  }

  const war = WARS[stage];
  const inIntro = within < INTRO_MS;
  const elapsed = within - INTRO_MS;
  const left = Math.max(0, Math.ceil((WAR_MS - elapsed) / 1000));

  return (
    <View style={styles.wrap}>
      <View style={[styles.hud, { backgroundColor: theme.accentSoft }]}>
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          {stage + 1}/{WARS.length} {war.emoji} {war.title}
        </ThemedText>
        <Pressable
          hitSlop={8}
          onPress={() => {
            sfx.setMuted(!muted);
            setMuted(!muted);
            if (muted) sfx.startDrone();
          }}>
          <ThemedText type="smallBold">{muted ? '🔇' : '🔊'}</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">
          {inIntro ? '' : `${left}초 · `}
          {total()}점
        </ThemedText>
      </View>
      {note ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {note}
        </ThemedText>
      ) : null}

      {inIntro ? (
        <View style={styles.center}>
          <ThemedText style={styles.bigEmoji}>{war.emoji}</ThemedText>
          <ThemedText type="subtitle" style={styles.centerText}>
            {war.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {war.passage} · {war.verse}
          </ThemedText>
          <ThemedText type="small" style={[styles.centerText, styles.how]}>
            {war.how}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.field}>
          {war.id === 'jericho' && (
            <Jericho key={stage} seed={seed} elapsed={elapsed} onScore={setScore(stage)} />
          )}
          {war.id === 'ai' && (
            <Ambush key={stage} seed={seed} elapsed={elapsed} onScore={setScore(stage)} />
          )}
          {war.id === 'gibeon' && (
            <Gibeon key={stage} seed={seed} elapsed={elapsed} onScore={setScore(stage)} />
          )}
          {war.id === 'kings' && (
            <Kings key={stage} seed={seed} elapsed={elapsed} onScore={setScore(stage)} />
          )}
        </View>
      )}
    </View>
  );
}

/** 지금까지 세 전쟁 합계 미리보기가 필요 없도록 TOTAL_MS 를 밖에서 쓸 수 있게 다시 내보낸다. */
export { TOTAL_MS };

function BigButton({
  label,
  onPress,
  color,
  disabled,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPressIn={onPress}
      style={({ pressed }) => [
        styles.bigButton,
        { backgroundColor: color ?? theme.backgroundSelected },
        disabled && styles.dim,
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={styles.onAccent}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ── 1. 여리고: 박자 맞춰 행진 ─────────────────────────────────

const JERICHO_TAPS = 7;
const JERICHO_PERIOD = 1700;

function Jericho({ seed, elapsed, onScore }: StageProps) {
  const theme = useTheme();
  const centers = useMemo(() => {
    const r = mulberry32(seed + 1);
    return Array.from({ length: JERICHO_TAPS }, () => 0.15 + r() * 0.7);
  }, [seed]);
  const [taps, setTaps] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;

  const pos = (ms: number) => {
    const p = (ms % JERICHO_PERIOD) / JERICHO_PERIOD;
    return p < 0.5 ? p * 2 : 2 - p * 2;
  };

  const next = taps.length;
  const press = () => {
    if (next >= JERICHO_TAPS) return;
    const dist = Math.abs(pos(elapsedRef.current) - centers[next]);
    const max = next === JERICHO_TAPS - 1 ? 28 : 12;
    const pts = Math.max(0, 1 - dist / 0.22) * max;
    const list = [...taps, pts];
    setTaps(list);
    onScore(list.reduce((a, b) => a + b, 0));
    setMsg(dist < 0.05 ? '정확!' : dist < 0.12 ? '좋아요' : '빗나감');
    const q = Math.max(0, 1 - dist / 0.22);
    if (next === JERICHO_TAPS - 1) sfx.wallFall(q);
    else if (q > 0.05) sfx.march(q);
    else sfx.miss();
  };

  const marker = pos(elapsed);
  const c = centers[Math.min(next, JERICHO_TAPS - 1)];
  const last = next === JERICHO_TAPS - 1;

  return (
    <View style={styles.stageBody}>
      <ThemedText type="smallBold" style={styles.centerText}>
        {next >= JERICHO_TAPS
          ? '성벽이 무너졌습니다!'
          : last
            ? `${next + 1}번째 — 큰 소리로 외치라!`
            : `${next + 1}번째 날 행진`}
      </ThemedText>
      <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View
          style={[
            styles.zone,
            { left: `${(c - 0.1) * 100}%`, backgroundColor: next >= JERICHO_TAPS ? 'transparent' : '#4CAF50' },
          ]}
        />
        <View style={[styles.marker, { left: `${marker * 100}%`, backgroundColor: theme.accent }]} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {msg || ' '}
      </ThemedText>
      <BigButton label={last ? '📣 함성!' : '🎺 행진'} onPress={press} disabled={next >= JERICHO_TAPS} />
    </View>
  );
}

// ── 2. 아이 성: 매복 신호 따라 하기 ───────────────────────────

const SIGNAL_COLORS = ['#D9534F', '#4A7FC1', '#4CAF50', '#E9B44C'];
const SIGNAL_NAMES = ['붉은 깃발', '푸른 깃발', '초록 깃발', '노란 깃발'];
const ROUNDS = [3, 4, 5];
const STEP_MS = 800;

function Ambush({ seed, elapsed, onScore }: StageProps) {
  const theme = useTheme();
  const seq = useMemo(() => {
    const r = mulberry32(seed + 2);
    return Array.from({ length: 12 }, () => Math.floor(r() * 4));
  }, [seed]);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'show' | 'input' | 'done'>('show');
  const [phaseStart, setPhaseStart] = useState(0);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);

  const offset = ROUNDS.slice(0, round).reduce((a, b) => a + b, 0);
  const len = ROUNDS[round] ?? 0;
  const mySeq = seq.slice(offset, offset + len);

  // 보여 주기가 끝나면 따라 하는 차례로.
  useEffect(() => {
    if (phase === 'show' && elapsed - phaseStart >= len * STEP_MS + 400) {
      setPhase('input');
      setIdx(0);
    }
  }, [elapsed, phase, phaseStart, len]);

  const lit =
    phase === 'show'
      ? (() => {
          const k = Math.floor((elapsed - phaseStart - 300) / STEP_MS);
          const into = elapsed - phaseStart - 300 - k * STEP_MS;
          return k >= 0 && k < len && into < 560 ? mySeq[k] : null;
        })()
      : flash;

  const nextRound = (gained: number) => {
    const total = correct + gained;
    setCorrect(total);
    onScore((total / ROUNDS.reduce((a, b) => a + b, 0)) * 100);
    if (round + 1 >= ROUNDS.length) {
      setPhase('done');
    } else {
      setRound(round + 1);
      setPhase('show');
      setPhaseStart(elapsed);
    }
  };

  const press = (c: number) => {
    if (phase !== 'input') return;
    setFlash(c);
    sfx.signal(c, 0.2);
    setTimeout(() => setFlash(null), 150);
    if (c !== mySeq[idx]) {
      sfx.wrong();
      nextRound(idx); // 틀리면 지금까지 맞춘 만큼만 인정하고 다음 판으로
      return;
    }
    if (idx + 1 >= len) {
      sfx.stageEnd();
      nextRound(len);
    }
    else setIdx(idx + 1);
  };

  return (
    <View style={styles.stageBody}>
      <ThemedText type="smallBold" style={styles.centerText}>
        {phase === 'done'
          ? '매복 성공!'
          : phase === 'show'
            ? `신호를 보세요 (${round + 1}/${ROUNDS.length}, ${len}개)`
            : `따라 하세요 ${idx}/${len}`}
      </ThemedText>
      <View style={styles.signalGrid}>
        {SIGNAL_COLORS.map((col, i) => (
          <Pressable
            key={i}
            onPressIn={() => press(i)}
            disabled={phase !== 'input'}
            style={[
              styles.signal,
              { backgroundColor: col, opacity: lit === i ? 1 : 0.35, borderColor: theme.border },
            ]}>
            <ThemedText type="smallBold" style={styles.onAccent}>
              {SIGNAL_NAMES[i]}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── 3. 기브온: 해를 머물게 하라 ───────────────────────────────

const BAND_LO = 0.45;
const BAND_HI = 0.75;

function Gibeon({ seed, elapsed, onScore }: StageProps) {
  const theme = useTheme();
  const phase = useMemo(() => mulberry32(seed + 3)() * 6.28, [seed]);
  const sim = useRef({ y: 0.62, v: 0, last: 0, inBand: 0 });
  const [, force] = useState(0);

  // 시계가 한 칸 갈 때마다 해를 한 걸음 옮긴다.
  const s = sim.current;
  const dt = Math.min(0.2, Math.max(0, (elapsed - s.last) / 1000));
  if (dt > 0) {
    const sec = elapsed / 1000;
    // 봇으로 잰 값(탭을 0.3초마다 정확히 → 만점, 0.45초마다 → 30점대, 손 놓음 → 6점).
    const gravity = 0.3 + 0.01 * sec;
    const gust = 0.08 * Math.sin(sec * 1.7 + phase);
    s.v += (-gravity + gust) * dt;
    s.v *= 1 - 0.9 * dt;
    s.y = Math.max(0, Math.min(1, s.y + s.v * dt));
    if (s.y <= 0 || s.y >= 1) s.v = 0;
    if (s.y >= BAND_LO && s.y <= BAND_HI) s.inBand += dt * 1000;
    s.last = elapsed;
  }
  onScore((s.inBand / WAR_MS) * 100 * 1.12);

  const pray = () => {
    sfx.pray();
    s.v = Math.min(0.5, s.v + 0.2);
    force((n) => n + 1);
  };

  const inBand = s.y >= BAND_LO && s.y <= BAND_HI;
  return (
    <View style={styles.stageBody}>
      <ThemedText type="smallBold" style={styles.centerText}>
        {inBand ? '해가 머뭅니다' : s.y < BAND_LO ? '해가 내려갑니다!' : '너무 높이 올랐습니다'}
      </ThemedText>
      <View style={[styles.sky, { backgroundColor: '#23345C', borderColor: theme.border }]}>
        <View
          style={[
            styles.skyBand,
            { bottom: `${BAND_LO * 100}%`, height: `${(BAND_HI - BAND_LO) * 100}%` },
          ]}
        />
        <ThemedText style={[styles.sun, { bottom: `${s.y * 88}%` }]}>☀️</ThemedText>
      </View>
      <BigButton label="🙏 기도" onPress={pray} />
    </View>
  );
}

// ── 4. 막게다 굴의 다섯 왕 ────────────────────────────────────

const KING_EVENTS = 22;
const KING_EVERY = 1000;
const KING_VISIBLE = 1200;

function Kings({ seed, elapsed, onScore }: StageProps) {
  const theme = useTheme();
  const events = useMemo(() => {
    const r = mulberry32(seed + 4);
    const kingAt = new Set<number>();
    while (kingAt.size < 5) kingAt.add(1 + Math.floor(r() * (KING_EVENTS - 1)));
    let prev = -1;
    return Array.from({ length: KING_EVENTS }, (_, e) => {
      let hole = Math.floor(r() * 9);
      if (hole === prev) hole = (hole + 1 + Math.floor(r() * 8)) % 9;
      prev = hole;
      return { hole, king: kingAt.has(e) };
    });
  }, [seed]);

  const [hit, setHit] = useState<Set<number>>(new Set());
  const [kingsDown, setKingsDown] = useState(0);
  const [wrong, setWrong] = useState(0);
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;

  const visibleAt = (e: number, ms: number) =>
    ms >= e * KING_EVERY && ms < e * KING_EVERY + KING_VISIBLE && !hit.has(e);

  const tap = (hole: number) => {
    const ms = elapsedRef.current;
    for (let e = 0; e < KING_EVENTS; e++) {
      if (events[e].hole === hole && visibleAt(e, ms)) {
        const nextHit = new Set(hit).add(e);
        setHit(nextHit);
        let k = kingsDown;
        let w = wrong;
        if (events[e].king) {
          k += 1;
          sfx.king();
        } else {
          w += 1;
          sfx.people();
        }
        setKingsDown(k);
        setWrong(w);
        onScore(Math.max(0, k * 20 - w * 10));
        return;
      }
    }
  };

  return (
    <View style={styles.stageBody}>
      <ThemedText type="smallBold" style={styles.centerText}>
        잡은 왕 {kingsDown}/5 · 우리 백성을 누름 {wrong}
      </ThemedText>
      <View style={styles.holeGrid}>
        {Array.from({ length: 9 }, (_, hole) => {
          let shown: '👑' | '🙂' | null = null;
          for (let e = 0; e < KING_EVENTS; e++) {
            if (events[e].hole === hole && visibleAt(e, elapsed)) {
              shown = events[e].king ? '👑' : '🙂';
              break;
            }
          }
          return (
            <Pressable
              key={hole}
              onPressIn={() => tap(hole)}
              style={[styles.hole, { backgroundColor: '#3A2E26', borderColor: theme.border }]}>
              <ThemedText style={styles.holeEmoji}>{shown ?? ''}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  bigEmoji: { fontSize: 64, lineHeight: 76 },
  how: { marginTop: Spacing.two, lineHeight: 20 },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 10,
  },
  note: { textAlign: 'center', marginTop: Spacing.one },
  field: { flex: 1, paddingVertical: Spacing.three },
  stageBody: { flex: 1, gap: Spacing.three, justifyContent: 'center' },
  bigButton: { borderRadius: 999, paddingVertical: 20, alignItems: 'center' },
  onAccent: { color: '#fff' },
  dim: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  bar: { height: 56, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  zone: { position: 'absolute', top: 0, bottom: 0, width: '20%', opacity: 0.55 },
  marker: { position: 'absolute', top: 0, bottom: 0, width: 8, marginLeft: -4, borderRadius: 4 },
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center' },
  signal: {
    width: '46%',
    height: 90,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sky: { height: 260, borderRadius: 14, borderWidth: 1, overflow: 'hidden', alignItems: 'center' },
  skyBand: { position: 'absolute', left: 0, right: 0, backgroundColor: '#4CAF50', opacity: 0.35 },
  sun: { position: 'absolute', fontSize: 44, lineHeight: 52 },
  holeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center' },
  hole: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeEmoji: { fontSize: 38, lineHeight: 46 },
});
