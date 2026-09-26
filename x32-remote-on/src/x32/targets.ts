// 믹서의 무엇을 가리키는지(채널·DCA·버스·메인)와 그 OSC 주소. 주소는 이 파일 한 곳에만 둔다(§11.3).
export type TargetKind = 'ch' | 'auxin' | 'bus' | 'dca' | 'main';
export type Target = { kind: TargetKind; n: number };

const two = (n: number) => String(n).padStart(2, '0');

export const TARGET_RANGE: Record<TargetKind, [number, number]> = {
  ch: [1, 32],
  auxin: [1, 8],
  bus: [1, 16],
  dca: [1, 8],
  main: [1, 1],
};

export function targetKey(t: Target): string {
  return `${t.kind}:${t.n}`;
}

export function parseTargetKey(k: string): Target | null {
  const [kind, n] = k.split(':');
  const r = TARGET_RANGE[kind as TargetKind];
  const num = Number(n);
  if (!r || !Number.isInteger(num) || num < r[0] || num > r[1]) return null;
  return { kind: kind as TargetKind, n: num };
}

function base(t: Target): string {
  switch (t.kind) {
    case 'ch': return `/ch/${two(t.n)}`;
    case 'auxin': return `/auxin/${two(t.n)}`;
    case 'bus': return `/bus/${two(t.n)}`;
    case 'dca': return `/dca/${t.n}`;
    case 'main': return '/main/st';
  }
}

/** DCA 는 mix/ 단계가 없다: /dca/1/fader, /dca/1/on */
export function faderAddr(t: Target): string {
  return t.kind === 'dca' ? `${base(t)}/fader` : `${base(t)}/mix/fader`;
}
/** X32 의 on 은 1=소리 남, 0=음소거 */
export function onAddr(t: Target): string {
  return t.kind === 'dca' ? `${base(t)}/on` : `${base(t)}/mix/on`;
}
export function nameAddr(t: Target): string {
  return `${base(t)}/config/name`;
}

export function targetLabel(t: Target): string {
  switch (t.kind) {
    case 'ch': return `CH ${t.n}`;
    case 'auxin': return `AUX IN ${t.n}`;
    case 'bus': return `BUS ${t.n}`;
    case 'dca': return `DCA ${t.n}`;
    case 'main': return 'MAIN LR';
  }
}

/** 주소 → 대상. 회신을 상태 저장소 어느 칸에 넣을지 정한다. */
export function parseAddr(addr: string): { target: Target; field: 'fader' | 'on' | 'name' } | null {
  let m = addr.match(/^\/(ch|auxin|bus)\/(\d\d)\/mix\/(fader|on)$/);
  if (m) return { target: { kind: m[1] as TargetKind, n: +m[2] }, field: m[3] as 'fader' | 'on' };
  m = addr.match(/^\/(ch|auxin|bus)\/(\d\d)\/config\/name$/);
  if (m) return { target: { kind: m[1] as TargetKind, n: +m[2] }, field: 'name' };
  m = addr.match(/^\/dca\/(\d)\/(fader|on)$/);
  if (m) return { target: { kind: 'dca', n: +m[1] }, field: m[2] as 'fader' | 'on' };
  m = addr.match(/^\/dca\/(\d)\/config\/name$/);
  if (m) return { target: { kind: 'dca', n: +m[1] }, field: 'name' };
  m = addr.match(/^\/main\/st\/mix\/(fader|on)$/);
  if (m) return { target: { kind: 'main', n: 1 }, field: m[1] as 'fader' | 'on' };
  m = addr.match(/^\/main\/st\/config\/name$/);
  if (m) return { target: { kind: 'main', n: 1 }, field: 'name' };
  return null;
}
