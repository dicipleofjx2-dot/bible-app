/**
 * 전도 — 걸음의 종류와 날짜 셈. 화면·DB 모듈 어디에도 섞지 않은 순수 함수다.
 *
 * 걸음의 순서(`kindRank`)는 0090 의 evangelism_rank() 와 **같아야 한다.** 둘 중 하나만
 * 고치면 나눔 카드의 단계 막대와 내 화면의 단계가 어긋난다.
 */

export type ActionKind = 'pray' | 'contact' | 'gift' | 'meet' | 'invite' | 'attend' | 'settle';

export const ACTION_KINDS: { kind: ActionKind; label: string; emoji: string; hint: string }[] = [
  { kind: 'pray', label: '기도', emoji: '🙏', hint: '이름을 부르며 기도했어요' },
  { kind: 'contact', label: '연락', emoji: '💬', hint: '안부 문자·전화를 했어요' },
  { kind: 'gift', label: '선물', emoji: '🎁', hint: '작은 선물·식사로 마음을 전했어요' },
  { kind: 'meet', label: '만남', emoji: '☕', hint: '직접 만나 시간을 보냈어요' },
  { kind: 'invite', label: '초대', emoji: '💌', hint: '예배에 초대했어요' },
  { kind: 'attend', label: '참석', emoji: '⛪', hint: '예배에 함께 왔어요' },
  { kind: 'settle', label: '정착', emoji: '🌱', hint: '교회 생활을 이어 가요' },
];

export function kindLabel(kind: string): string {
  return ACTION_KINDS.find((k) => k.kind === kind)?.label ?? kind;
}

export function kindEmoji(kind: string): string {
  return ACTION_KINDS.find((k) => k.kind === kind)?.emoji ?? '•';
}

export function kindRank(kind: string | null | undefined): number {
  const i = ACTION_KINDS.findIndex((k) => k.kind === kind);
  return i < 0 ? 0 : i + 1;
}

function parse(iso: string): Date {
  // 'YYYY-MM-DD' 를 new Date(iso) 로 읽으면 UTC 라 한국에서 하루가 밀린다.
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 오늘에서 그날까지 남은 날(그날=0, 지났으면 음수). */
export function daysUntil(iso: string, today = new Date()): number {
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((parse(iso).getTime() - a) / 86400000);
}

export function dDayLabel(iso: string, today = new Date()): string {
  const n = daysUntil(iso, today);
  if (n === 0) return 'D-DAY';
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

export type PhaseLike = { startOn: string; endOn: string };

/**
 * 오늘이 속한 단계의 자리. 단계 사이 빈 날이면 다음 단계(아직 안 시작)를, 모두
 * 지났으면 -1 을 돌려준다.
 */
export function currentPhaseIndex(phases: PhaseLike[], today = new Date()): number {
  for (let i = 0; i < phases.length; i++) {
    if (daysUntil(phases[i].endOn, today) >= 0) return i;
  }
  return -1;
}

export function phaseStatus(p: PhaseLike, today = new Date()): 'past' | 'now' | 'next' {
  if (daysUntil(p.endOn, today) < 0) return 'past';
  if (daysUntil(p.startOn, today) > 0) return 'next';
  return 'now';
}

export function formatDay(iso: string): string {
  const d = parse(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`;
}

export function formatRange(startOn: string, endOn: string): string {
  return startOn === endOn ? formatDay(startOn) : `${formatDay(startOn)} ~ ${formatDay(endOn)}`;
}
