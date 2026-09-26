// X32 연결·상태·명령. 원칙(§9·§11.3):
//  - 믹서가 진실이다. 보낸 값을 곧바로 확정하지 않고, 회신으로만 상태를 바꾼다.
//  - 끊기면 명령을 받지 않는다. 쌓아 두었다가 재연결 때 몰아 보내는 일이 없도록 큐가 아예 없다.
//  - 끊기면 진행 중인 페이드도 멈춘다. 재연결 뒤 실제 값을 다시 읽는다.
import { decode, encode, f, i, type OscArg, type OscMessage } from '../osc/codec';
import { fadeValue, FADE_TICK_MS, type Curve } from './fade';
import { faderAddr, nameAddr, onAddr, parseAddr, targetKey, type Target } from './targets';
import type { Transport } from './transport';

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'lost';
export type ChannelState = { fader?: number; on?: boolean; name?: string };
export type FadeJob = { key: string; from: number; to: number; startedAt: number; durationMs: number; curve: Curve; muteAfter: boolean };

export type ClientState = {
  status: ConnStatus;
  latencyMs: number | null;
  info: { name: string; model: string; firmware: string } | null;
  channels: Record<string, ChannelState>;
  scenes: Record<number, string>;
  fades: Record<string, FadeJob>;
  /** 장면 호출 직후, 값이 다 돌아올 때까지 조작을 막는다(§5.4) */
  syncingUntil: number;
};

const HEARTBEAT_MS = 1000;
const LOST_AFTER_MS = 3000;
const XREMOTE_EVERY_MS = 8000; // X32 는 10초 동안 /xremote 가 없으면 변경 알림을 끊는다

export class X32Client {
  state: ClientState = { status: 'idle', latencyMs: null, info: null, channels: {}, scenes: {}, fades: {}, syncingUntil: 0 };
  private listeners = new Set<() => void>();
  private timers: ReturnType<typeof setInterval>[] = [];
  private fadeTimers = new Map<string, ReturnType<typeof setInterval>>();
  private lastReplyAt = 0;
  private infoSentAt = 0;
  private watched: Target[] = [];

  private transport: Transport;
  private now: () => number;

  constructor(transport: Transport, now: () => number = Date.now) {
    this.transport = transport;
    this.now = now;
    transport.onMessage((d) => {
      const m = decode(d);
      if (m) this.receive(m);
    });
  }

  // ── 구독 (useSyncExternalStore) ─────────────────────
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  getState = () => this.state;
  private set(patch: Partial<ClientState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }
  private setChannel(key: string, patch: ChannelState) {
    this.set({ channels: { ...this.state.channels, [key]: { ...this.state.channels[key], ...patch } } });
  }

  // ── 연결 ────────────────────────────────────────────
  start(watched: Target[]) {
    this.watched = watched;
    this.set({ status: 'connecting' });
    this.heartbeat();
    this.send({ address: '/xremote', args: [] });
    this.timers.push(setInterval(() => this.heartbeat(), HEARTBEAT_MS));
    this.timers.push(setInterval(() => this.send({ address: '/xremote', args: [] }), XREMOTE_EVERY_MS));
  }

  stop() {
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.cancelAllFades();
    this.transport.close();
    this.set({ status: 'idle' });
  }

  get connected() {
    return this.state.status === 'connected';
  }

  get canOperate() {
    return this.connected && this.now() >= this.state.syncingUntil;
  }

  private heartbeat() {
    if (this.lastReplyAt && this.now() - this.lastReplyAt > LOST_AFTER_MS && this.state.status === 'connected') {
      this.cancelAllFades();
      this.set({ status: 'lost', latencyMs: null });
    }
    this.infoSentAt = this.now();
    this.send({ address: '/info', args: [] });
  }

  private send(m: OscMessage) {
    this.transport.send(encode(m));
  }

  /** 지켜보는 채널의 값·이름과 장면 이름을 다시 읽는다. 연결·재연결·장면 호출 뒤에 부른다. */
  resync() {
    for (const t of this.watched) {
      this.send({ address: faderAddr(t), args: [] });
      this.send({ address: onAddr(t), args: [] });
      this.send({ address: nameAddr(t), args: [] });
    }
    for (let n = 0; n < 20; n++) this.send({ address: `/-show/showfile/scene/${String(n).padStart(3, '0')}/name`, args: [] });
  }

  setWatched(watched: Target[]) {
    this.watched = watched;
    if (this.connected) this.resync();
  }

  private receive(m: OscMessage) {
    this.lastReplyAt = this.now();
    if (m.address === '/info') {
      const [, name, model, fw] = m.args.map((a) => (a.t === 's' ? a.v : ''));
      const wasUp = this.state.status === 'connected';
      this.set({ status: 'connected', latencyMs: Math.max(0, this.now() - this.infoSentAt), info: { name, model, firmware: fw } });
      if (!wasUp) {
        // 새로 붙었거나 끊겼다 돌아왔다: 화면을 믿지 말고 믹서에서 다시 읽는다.
        this.send({ address: '/xremote', args: [] });
        this.resync();
      }
      return;
    }
    const sm = m.address.match(/^\/-show\/showfile\/scene\/(\d{3})\/name$/);
    if (sm && m.args[0]?.t === 's') {
      this.set({ scenes: { ...this.state.scenes, [Number(sm[1])]: m.args[0].v } });
      return;
    }
    const p = parseAddr(m.address);
    const a = m.args[0];
    if (!p || !a) return;
    const key = targetKey(p.target);
    if (p.field === 'fader' && a.t === 'f') {
      // 페이드 중에 다른 곳(믹서 앞·다른 폰)에서 페이더를 잡으면 자동 페이드를 멈춘다(§6).
      const job = this.state.fades[key];
      if (job && Math.abs(a.v - this.expectedFade(job)) > 0.08) {
        this.cancelFade(key);
        // 이미 날아간 페이드 한 걸음이 사람이 잡은 값을 덮어쓸 수 있다. 잡은 값을 한 번 되돌려 준다.
        this.send({ address: faderAddr(p.target), args: [f(a.v)] });
      }
      this.setChannel(key, { fader: a.v });
    } else if (p.field === 'on' && a.t === 'i') this.setChannel(key, { on: a.v === 1 });
    else if (p.field === 'name' && a.t === 's') this.setChannel(key, { name: a.v });
  }

  // ── 명령 ────────────────────────────────────────────
  /** 끊겼거나 동기화 중이면 false. 보내지 않은 명령은 버린다(나중에 몰아서 가지 않는다). */
  setFader(t: Target, v: number, opts: { confirm?: boolean } = {}): boolean {
    if (!this.canOperate) return false;
    const val = Math.min(1, Math.max(0, v));
    this.send({ address: faderAddr(t), args: [f(val)] });
    if (opts.confirm !== false) this.send({ address: faderAddr(t), args: [] });
    return true;
  }

  setOn(t: Target, on: boolean): boolean {
    if (!this.canOperate) return false;
    this.send({ address: onAddr(t), args: [i(on ? 1 : 0)] });
    this.send({ address: onAddr(t), args: [] });
    return true;
  }

  loadScene(n: number): boolean {
    if (!this.canOperate) return false;
    this.cancelAllFades();
    this.send({ address: '/-action/goscene', args: [i(n)] });
    this.set({ syncingUntil: this.now() + 1500 });
    setTimeout(() => this.resync(), 300);
    setTimeout(() => this.set({ syncingUntil: 0 }), 1500);
    return true;
  }

  // ── 페이드 ──────────────────────────────────────────
  private expectedFade(job: FadeJob) {
    return fadeValue(job.from, job.to, job.curve, this.now() - job.startedAt, job.durationMs);
  }

  /**
   * 현재 값에서 to 까지 durationMs 동안 움직인다. fadeIn 이면 음소거를 먼저 풀고 0 에서 시작한다.
   * muteAfter 면 끝에 음소거. 끊기면 그 자리에서 멈추고 다시 보내지 않는다.
   */
  fade(t: Target, to: number, durationMs: number, curve: Curve, opts: { muteAfter?: boolean; fromZero?: boolean } = {}): boolean {
    if (!this.canOperate) return false;
    const key = targetKey(t);
    this.cancelFade(key);
    const cur = this.state.channels[key];
    let from = cur?.fader ?? 0;
    if (opts.fromZero) {
      from = cur?.on === false ? 0 : Math.min(from, to);
      if (cur?.on === false) {
        this.send({ address: faderAddr(t), args: [f(0)] });
        this.send({ address: onAddr(t), args: [i(1)] });
      }
    }
    const job: FadeJob = { key, from, to, startedAt: this.now(), durationMs, curve, muteAfter: !!opts.muteAfter };
    this.set({ fades: { ...this.state.fades, [key]: job } });
    const timer = setInterval(() => {
      if (!this.connected) return this.cancelFade(key);
      const el = this.now() - job.startedAt;
      const v = fadeValue(job.from, job.to, job.curve, el, job.durationMs);
      this.send({ address: faderAddr(t), args: [f(v)] });
      this.setChannel(key, { fader: v });
      if (el >= job.durationMs) {
        this.cancelFade(key);
        if (job.muteAfter) this.send({ address: onAddr(t), args: [i(0)] });
        this.send({ address: faderAddr(t), args: [] });
        this.send({ address: onAddr(t), args: [] });
      }
    }, FADE_TICK_MS);
    this.fadeTimers.set(key, timer);
    return true;
  }

  cancelFade(key: string) {
    const tm = this.fadeTimers.get(key);
    if (tm) clearInterval(tm);
    this.fadeTimers.delete(key);
    if (this.state.fades[key]) {
      const { [key]: _, ...rest } = this.state.fades;
      this.set({ fades: rest });
    }
  }

  cancelAllFades() {
    for (const k of [...this.fadeTimers.keys()]) this.cancelFade(k);
  }
}
