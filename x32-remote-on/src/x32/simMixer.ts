// 장비 없이 앱과 검사를 돌리기 위한 가짜 X32. 실제 X32 처럼 조회에 회신하고,
// /xremote 를 보낸 상대에게 "다른 곳에서 바뀐 값"을 밀어 준다(보낸 쪽엔 되돌려 보내지 않는다).
import { decode, encode, f, i, s, type OscArg, type OscMessage } from '../osc/codec';
import { faderAddr, nameAddr, onAddr, TARGET_RANGE, type Target, type TargetKind } from './targets';
import type { Transport } from './transport';

type Reply = (m: OscMessage) => void;

const DEFAULT_NAMES: Record<string, string> = {
  '/ch/01/config/name': '사회자',
  '/ch/02/config/name': '설교',
  '/ch/03/config/name': '인도자',
  '/ch/04/config/name': '싱어1',
  '/ch/05/config/name': '싱어2',
  '/ch/09/config/name': '건반',
  '/ch/11/config/name': '기타',
  '/ch/17/config/name': '유튜브',
  '/ch/19/config/name': '배경음악',
  '/dca/1/config/name': '찬양팀',
  '/dca/2/config/name': '악기',
};

export class SimMixer {
  values = new Map<string, OscArg>();
  scene = 0;
  private clients = new Set<Reply>();

  constructor() {
    for (const kind of Object.keys(TARGET_RANGE) as TargetKind[]) {
      const [a, b] = TARGET_RANGE[kind];
      for (let n = a; n <= b; n++) {
        const t: Target = { kind, n };
        this.values.set(faderAddr(t), f(kind === 'main' ? 0.75 : 0.6));
        this.values.set(onAddr(t), i(1));
        this.values.set(nameAddr(t), s(DEFAULT_NAMES[nameAddr(t)] ?? ''));
      }
    }
    ['주일예배', '금요예배', '부흥기도회', 'R2M훈련', '영상상영'].forEach((n, k) =>
      this.values.set(`/-show/showfile/scene/${String(k).padStart(3, '0')}/name`, s(n)),
    );
  }

  handle(m: OscMessage, reply: Reply) {
    if (m.address === '/info') return reply({ address: '/info', args: [s('V2.07'), s('시뮬레이터'), s('X32'), s('4.06')] });
    if (m.address === '/xremote') return void this.clients.add(reply);
    if (m.address === '/-action/goscene' && m.args[0]?.t === 'i') return this.loadScene(m.args[0].v);
    const cur = this.values.get(m.address);
    if (!cur) return;
    if (m.args.length === 0) return reply({ address: m.address, args: [cur] });
    const v = m.args[0];
    if (v.t !== cur.t) return;
    this.values.set(m.address, v);
    for (const c of this.clients) if (c !== reply) c({ address: m.address, args: [v] });
  }

  /** 장면을 부르면 여러 값이 한꺼번에 바뀐다. 실제 X32 처럼 xremote 상대에게 퍼뜨린다. */
  loadScene(n: number) {
    this.scene = n;
    this.pushFromDesk('/ch/02/mix/on', i(n === 0 ? 1 : 0));
    this.pushFromDesk('/dca/1/fader', f(0.5 + n * 0.05));
  }

  /** 믹서 앞에서 사람이 직접 만진 것처럼 값을 바꾼다. */
  pushFromDesk(address: string, v: OscArg) {
    if (!this.values.has(address)) return;
    this.values.set(address, v);
    for (const c of this.clients) c({ address, args: [v] });
  }
}

/** 같은 프로세스 안에서 SimMixer 에 붙는 길. latencyMs 로 네트워크 지연을, drop 으로 끊김을 흉내낸다. */
export function createSimTransport(mixer: SimMixer, opts: { latencyMs?: number } = {}): Transport & { drop: boolean } {
  let cb: ((d: Uint8Array) => void) | null = null;
  const lat = opts.latencyMs ?? 8;
  const t = {
    drop: false,
    send(data: Uint8Array) {
      if (t.drop) return;
      const m = decode(data);
      if (!m) return;
      setTimeout(() => mixer.handle(m, reply), lat / 2);
    },
    onMessage(fn: (d: Uint8Array) => void) {
      cb = fn;
    },
    close() {
      cb = null;
    },
  };
  const reply: Reply = (m) => {
    if (t.drop) return;
    const bytes = encode(m);
    setTimeout(() => cb?.(bytes), lat / 2);
  };
  return t;
}
