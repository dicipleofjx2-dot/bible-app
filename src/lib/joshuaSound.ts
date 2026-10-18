import { Platform } from 'react-native';

/** 여호수아의 전쟁 소리. → docs/arcade/README.md
 *
 * 음원 파일은 한 개도 안 쓴다 — WebAudio 로 그 자리에서 만든다(genesis-arcade.html 과 같은 길).
 * 파일을 걸면 웹과 앱 중 한쪽에서 조용히 404 가 된다.
 * 웹에서만 소리가 난다. 앱(네이티브)에는 WebAudio 가 없어 조용히 넘어간다. */

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let muted = false;
let droneStop: (() => void) | null = null;

function audio(): Ctx | null {
  if (Platform.OS !== 'web' || muted) return null;
  try {
    if (!ctx) {
      const AC: typeof AudioContext | undefined =
        (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, glideTo?: number) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol: number, freq: number, q = 1, kind: BiquadFilterType = 'lowpass', when = 0) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + when;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = kind;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

// 히자즈 음계(근동의 냄새) — 아케이드 본편과 같은 자리.
const SCALE = [0, 1, 4, 5, 7, 8, 10, 12];
const hz = (step: number, root = 220) => root * Math.pow(2, SCALE[step % 8] / 12 + Math.floor(step / 8));

export const sfx = {
  setMuted(m: boolean) {
    muted = m;
    if (m) sfx.stopDrone();
  },
  isMuted: () => muted,

  /** 셋·둘·하나. */
  beep(final = false) {
    blip(final ? 880 : 520, final ? 0.35 : 0.14, 'square', 0.12);
  },

  /** 전쟁 시작 나팔(쇼파르). */
  shofar() {
    blip(150, 0.55, 'sawtooth', 0.16, 0, 300);
    blip(300, 0.7, 'sawtooth', 0.12, 0.5, 290);
    noise(0.5, 0.04, 900, 1, 'bandpass');
  },

  go() {
    blip(440, 0.1, 'triangle', 0.15);
    blip(660, 0.18, 'triangle', 0.15, 0.09);
  },

  /** 전쟁이 끝날 때. */
  stageEnd() {
    [0, 2, 4].forEach((s, i) => blip(hz(s, 330), 0.22, 'triangle', 0.13, i * 0.1));
  },

  /** 행진 북. quality 0~1 이 좋을수록 소리가 또렷하다. */
  march(quality: number) {
    blip(110, 0.18, 'sine', 0.3, 0, 48);
    noise(0.08, 0.1 + quality * 0.1, 1800, 1, 'bandpass');
    if (quality > 0.6) blip(hz(4, 330), 0.2, 'triangle', 0.1, 0.02);
  },

  miss() {
    blip(150, 0.25, 'sawtooth', 0.12, 0, 70);
  },

  /** 일곱째 날 함성과 성벽이 무너지는 소리. */
  wallFall(quality: number) {
    blip(130, 0.9, 'sawtooth', 0.18, 0, 260);
    noise(0.9, 0.18, 400, 1, 'lowpass', 0.2);
    noise(0.5, 0.12 * (0.4 + quality), 2200, 0.8, 'highpass', 0.35);
    [0, 2, 4, 7].forEach((s, i) => blip(hz(s, 330), 0.4, 'triangle', 0.1, 0.45 + i * 0.09));
  },

  /** 깃발 신호 네 음. */
  signal(i: number, dur = 0.34) {
    blip(hz([0, 2, 4, 7][i] ?? 0, 262), dur, 'triangle', 0.18);
  },

  wrong() {
    blip(120, 0.35, 'square', 0.1, 0, 60);
  },

  /** 해를 붙들어 올리는 기도. */
  pray() {
    blip(hz(4, 330), 0.35, 'sine', 0.1, 0, hz(7, 330));
    blip(hz(7, 330), 0.45, 'sine', 0.06, 0.05);
  },

  king() {
    noise(0.1, 0.18, 700, 1, 'bandpass');
    blip(220, 0.16, 'square', 0.14, 0, 90);
    blip(hz(7, 330), 0.25, 'triangle', 0.14, 0.08);
  },

  people() {
    blip(330, 0.3, 'sine', 0.12, 0, 160);
  },

  victory() {
    [0, 2, 4, 7, 4, 7, 9].forEach((s, i) => blip(hz(s, 330), 0.3, 'triangle', 0.14, i * 0.14));
  },

  defeat() {
    [7, 5, 2, 0].forEach((s, i) => blip(hz(s, 220), 0.4, 'sawtooth', 0.08, i * 0.2));
  },

  /** 깔리는 낮은 소리(전쟁 내내). level 0~1 이 높을수록 가락이 한 겹 더 얹힌다. */
  startDrone() {
    const c = audio();
    if (!c || !master || droneStop) return;
    const g = c.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 1.5);
    g.connect(master);
    const a = c.createOscillator();
    const b = c.createOscillator();
    a.type = 'sawtooth';
    b.type = 'sine';
    a.frequency.value = 55;
    b.frequency.value = 82.5;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 260;
    a.connect(f).connect(g);
    b.connect(g);
    a.start();
    b.start();
    // 박자 북
    let n = 0;
    const iv = setInterval(() => {
      if (n % 4 === 0) blip(90, 0.16, 'sine', 0.12, 0, 45);
      else if (n % 4 === 2) noise(0.05, 0.05, 1500, 1, 'bandpass');
      n++;
    }, 500);
    droneStop = () => {
      clearInterval(iv);
      try {
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6);
        a.stop(c.currentTime + 0.7);
        b.stop(c.currentTime + 0.7);
      } catch {
        /* 이미 멈춘 소리 */
      }
    };
  },

  stopDrone() {
    droneStop?.();
    droneStop = null;
  },
};
