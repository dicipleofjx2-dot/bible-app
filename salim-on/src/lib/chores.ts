/**
 * 살림ON 의 셈.
 *
 * **여기에는 화면도 데이터베이스도 없다.** 반복 전개·공평 배정·겹침 검사·
 * 점수 미리보기 전부 순수 함수다 — 화면을 못 띄우는 자리에서도 노드로
 * 돌려 검사할 수 있어야 하기 때문이다.
 *
 * 날짜는 전부 'YYYY-MM-DD' 글자다. Date 객체를 돌리면 시간대가 끼어들어
 * 「오늘」이 기기마다 달라진다 — 점수가 걸린 앱에서 그러면 안 된다.
 */

export type RepeatKind = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type TaskStatus = 'todo' | 'done' | 'approved' | 'rejected' | 'skipped';
export type Tone = 'good' | 'warn' | 'alert' | 'calm';

export type Chore = {
  id: string;
  title: string;
  category_id: string | null;
  minutes: number;
  difficulty: number;
  repeat_kind: RepeatKind;
  weekdays: number[];
  month_day: number | null;
  at_time: string;
  start_date: string;
  default_member_id: string | null;
  needs_review: boolean;
  active: boolean;
};

// ── 날짜 ────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 서울의 오늘. 기기가 어느 시간대에 있든 살림의 하루는 서울에서 끊긴다. */
export function todayInSeoul(now: Date = new Date()): string {
  // sv-SE 로케일이 'YYYY-MM-DD' 를 그대로 준다. 손으로 붙이면 한 자리 달에서 샌다.
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now);
}

/** 날짜 글자를 UTC 자정으로 읽는다. 시간대를 끼워 넣지 않기 위해서다. */
function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** 0=일요일 … 6=토요일. */
export function weekdayOf(date: string): number {
  return new Date(toUtc(date)).getUTCDay();
}

export function weekdayName(date: string): string {
  return WEEKDAY_NAMES[weekdayOf(date)];
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

/** 그 날이 든 주의 이레. weekStart 는 0=일 · 1=월. */
export function weekDates(anchor: string, weekStart = 1): string[] {
  const shift = (weekdayOf(anchor) - weekStart + 7) % 7;
  const first = addDays(anchor, -shift);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** 그 달의 첫날과 끝날. */
export function monthRange(anchor: string): { from: string; to: string } {
  const [y, m] = anchor.split('-').map(Number);
  const from = `${anchor.slice(0, 7)}-01`;
  const to = fromUtc(Date.UTC(y, m, 1) - DAY_MS); // 다음 달 1일 하루 전
  return { from, to };
}

export function formatDate(date: string): string {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 (${weekdayName(date)})`;
}

/** 'HH:MM' 또는 'HH:MM:SS' → 자정부터 몇 분. */
export function minutesOfTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatTime(time: string): string {
  const total = minutesOfTime(time);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const half = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${half} ${h12}:${String(m).padStart(2, '0')}`;
}

/** 'HH:MM:SS' 로 맞춰 준다. 표의 time 칸은 초까지 받는다. */
export function normalizeTime(time: string): string {
  const total = Math.max(0, Math.min(23 * 60 + 59, minutesOfTime(time)));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
}

// ── 반복 ────────────────────────────────────────────────────────────

/**
 * 이 집안일이 그 날에 있는가.
 *
 * **시작일보다 앞선 날에는 없다.** 오늘 만든 「매주 토요일」이 지난 세 달치
 * 토요일까지 밀린 일로 쏟아지면, 만든 사람이 먼저 앱을 닫는다.
 */
export function occursOn(chore: Chore, date: string): boolean {
  if (!chore.active) return false;
  if (date < chore.start_date) return false;

  switch (chore.repeat_kind) {
    case 'once':
      return date === chore.start_date;
    case 'daily':
      return true;
    case 'weekly':
      return chore.weekdays.includes(weekdayOf(date));
    case 'biweekly': {
      if (!chore.weekdays.includes(weekdayOf(date))) return false;
      // 시작일이 든 주를 0주로 세어 짝수 주만. 요일이 아니라 **주**로 세야
      // 「격주 토요일」이 요일별로 어긋나지 않는다.
      const weeks = Math.floor(daysBetween(weekDates(chore.start_date)[0], date) / 7);
      return weeks % 2 === 0;
    }
    case 'monthly':
      // 그 달에 없는 날(2월 31일)이면 그 달은 건너뛴다. 말일로 당겨 놓으면
      // 「31일에 하는 일」이 2월엔 28일이 되어 사람이 헷갈린다.
      return chore.month_day != null && dayOfMonth(date) === chore.month_day;
    default:
      return false;
  }
}

export function datesFor(chore: Chore, from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (occursOn(chore, d)) out.push(d);
  return out;
}

export function repeatLabel(chore: Pick<Chore, 'repeat_kind' | 'weekdays' | 'month_day'>): string {
  switch (chore.repeat_kind) {
    case 'once':
      return '한 번만';
    case 'daily':
      return '매일';
    case 'weekly':
      return chore.weekdays.length
        ? `매주 ${chore.weekdays.map((d) => WEEKDAY_NAMES[d]).join('·')}`
        : '매주 (요일 없음)';
    case 'biweekly':
      return chore.weekdays.length
        ? `격주 ${chore.weekdays.map((d) => WEEKDAY_NAMES[d]).join('·')}`
        : '격주 (요일 없음)';
    case 'monthly':
      return chore.month_day ? `매월 ${chore.month_day}일` : '매월 (날짜 없음)';
    default:
      return '';
  }
}

// ── 점수 ────────────────────────────────────────────────────────────
//
// **실제 점수는 표의 트리거가 매긴다**(0001_household.sql). 기기 시계를 믿고
// 점수를 매기면 시계를 돌려 정시 보너스를 받는 길이 열린다. 여기 있는 것은
// 화면에 미리 보여 주는 「예상 점수」뿐이고, 셈하는 식은 SQL 과 같다.

export function basePoints(difficulty: number, minutes: number): number {
  return difficulty * 4 + Math.ceil(minutes / 5) * 2;
}

export function qualityMultiplier(quality: number | null): number {
  switch (quality) {
    case 1:
      return 0.4;
    case 2:
      return 0.7;
    case 4:
      return 1.15;
    case 5:
      return 1.3;
    default:
      return 1.0;
  }
}

/** 정시에 끝내고 별 셋을 받았을 때의 점수 — 목록에 적어 두는 숫자다. */
export function estimatePoints(chore: Pick<Chore, 'difficulty' | 'minutes'>): number {
  return Math.max(0, Math.round(basePoints(chore.difficulty, chore.minutes) + 5));
}

export function statusLabel(status: TaskStatus, needsReview: boolean): { label: string; tone: Tone } {
  switch (status) {
    case 'done':
      return needsReview ? { label: '확인 기다림', tone: 'warn' } : { label: '끝냄', tone: 'good' };
    case 'approved':
      return { label: '확인됨', tone: 'good' };
    case 'rejected':
      return { label: '다시 해야 함', tone: 'alert' };
    case 'skipped':
      return { label: '건너뜀', tone: 'calm' };
    default:
      return { label: '아직', tone: 'calm' };
  }
}

// ── 공평 배정 ───────────────────────────────────────────────────────

export type AssignItem = {
  /** 일감을 가리키는 열쇠. 보통 `${choreId}:${date}`. */
  key: string;
  date: string;
  time: string;
  minutes: number;
  /** 이 일의 무게 = 기본점. 시간이 아니라 점수로 나눠야 공평하다. */
  weight: number;
  /** 늘 같은 사람이 하는 일이면 그 사람. 자동 배정이 건드리지 않는다. */
  fixedMemberId?: string | null;
};

export type AssignMember = { id: string; name: string };

export type AssignResult = {
  /** 일감 열쇠 → 식구 id */
  assignments: Record<string, string>;
  /** 식구 id → 이번 배정으로 더해진 점수 */
  added: Record<string, number>;
  /** 시간이 겹친 일감의 열쇠. 배정은 하되 화면에서 짚어 준다. */
  conflicts: string[];
};

/**
 * 이번 주치 일감을 식구에게 나눈다.
 *
 * **점수가 적은 사람에게 먼저 간다.** 돌아가며(라운드로빈) 주면 한 사람이
 * 어려운 일만 맡는 일이 생긴다 — 「몇 개」가 아니라 「몇 점」으로 나눠야
 * 공평하다는 것이 이 함수의 전부다.
 *
 * 같은 사람에게 시간이 겹치는 두 일을 몰아주지 않는다. 다만 겹치지 않게
 * 놓을 자리가 아예 없으면 **배정을 포기하지 않고** 점수가 가장 적은 사람에게
 * 주고 겹쳤다고 알린다 — 빈칸으로 남겨 두면 그 일은 아무도 안 한다.
 *
 * 같은 입력이면 늘 같은 결과가 나온다(동점은 이름 차례로 끊는다). 미리보기와
 * 확정이 달라지면 아무도 믿지 않는다.
 */
export function assignFairly(
  items: AssignItem[],
  members: AssignMember[],
  startingLoad: Record<string, number> = {}
): AssignResult {
  const result: AssignResult = { assignments: {}, added: {}, conflicts: [] };
  if (members.length === 0) return result;

  const order = [...members].sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id));
  const load: Record<string, number> = {};
  const count: Record<string, number> = {};
  const busy: Record<string, { date: string; from: number; to: number }[]> = {};
  for (const m of order) {
    load[m.id] = startingLoad[m.id] ?? 0;
    count[m.id] = 0;
    busy[m.id] = [];
    result.added[m.id] = 0;
  }

  const sorted = [...items].sort(
    (a, b) => a.date.localeCompare(b.date) || minutesOfTime(a.time) - minutesOfTime(b.time) || a.key.localeCompare(b.key)
  );

  for (const item of sorted) {
    const from = minutesOfTime(item.time);
    const to = from + Math.max(1, item.minutes);
    const clashes = (id: string) =>
      busy[id].some((slot) => slot.date === item.date && slot.from < to && from < slot.to);

    let chosen: string | null = null;
    if (item.fixedMemberId && load[item.fixedMemberId] !== undefined) {
      chosen = item.fixedMemberId;
      if (clashes(chosen)) result.conflicts.push(item.key);
    } else {
      const free = order.filter((m) => !clashes(m.id));
      const pool = free.length ? free : order;
      if (!free.length) result.conflicts.push(item.key);
      chosen = pool.reduce((best, m) => {
        if (load[m.id] !== load[best.id]) return load[m.id] < load[best.id] ? m : best;
        if (count[m.id] !== count[best.id]) return count[m.id] < count[best.id] ? m : best;
        return best;
      }, pool[0]).id;
    }

    result.assignments[item.key] = chosen;
    load[chosen] += item.weight;
    count[chosen] += 1;
    result.added[chosen] += item.weight;
    busy[chosen].push({ date: item.date, from, to });
  }

  return result;
}

/** 이미 배정된 일감 중 한 사람에게 시간이 겹친 것. 배치 화면이 짚어 준다. */
export function findOverlaps(
  items: { key: string; memberId: string | null; date: string; time: string; minutes: number }[]
): string[] {
  const byMember: Record<string, typeof items> = {};
  for (const it of items) {
    if (!it.memberId) continue;
    (byMember[it.memberId] ??= []).push(it);
  }
  const hit = new Set<string>();
  for (const list of Object.values(byMember)) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (a.date !== b.date) continue;
        const af = minutesOfTime(a.time);
        const bf = minutesOfTime(b.time);
        if (af < bf + Math.max(1, b.minutes) && bf < af + Math.max(1, a.minutes)) {
          hit.add(a.key);
          hit.add(b.key);
        }
      }
    }
  }
  return [...hit].sort();
}

// ── 점수판 ──────────────────────────────────────────────────────────

export type ScoreRow = {
  memberId: string;
  name: string;
  emoji: string;
  points: number;
  assigned: number;
  done: number;
  onTime: number;
  stars: number[];
  minutes: number;
};

export type ScoredTask = {
  member_id: string | null;
  status: TaskStatus;
  points: number;
  quality: number | null;
  late_minutes: number | null;
  minutes: number;
};

export function tallyScores(
  tasks: ScoredTask[],
  members: { id: string; display_name: string; emoji: string }[]
): ScoreRow[] {
  const rows = new Map<string, ScoreRow>();
  for (const m of members) {
    rows.set(m.id, {
      memberId: m.id,
      name: m.display_name,
      emoji: m.emoji,
      points: 0,
      assigned: 0,
      done: 0,
      onTime: 0,
      stars: [],
      minutes: 0,
    });
  }
  for (const t of tasks) {
    if (!t.member_id) continue;
    const row = rows.get(t.member_id);
    if (!row) continue;
    // 건너뛴 일은 맡은 적 없는 것으로 친다. 아파서 못 한 날이 개근을 깬다면
    // 아무도 정직하게 「건너뜀」을 누르지 않는다.
    if (t.status === 'skipped') continue;
    row.assigned += 1;
    row.points += t.points;
    if (t.status === 'done' || t.status === 'approved') {
      row.done += 1;
      row.minutes += t.minutes;
      if ((t.late_minutes ?? 0) === 0) row.onTime += 1;
    }
    if (t.quality != null) row.stars.push(t.quality);
  }
  return [...rows.values()].sort(
    (a, b) => b.points - a.points || b.done - a.done || a.name.localeCompare(b.name, 'ko')
  );
}

export type Badge = { memberId: string; emoji: string; label: string; why: string };

/**
 * 뱃지.
 *
 * **왜 받았는지를 같이 적는다.** 이유 없이 붙는 상은 다음 주에 다투는 씨앗이
 * 된다. 셈할 거리가 모자라면(너무 적게 맡은 주) 아예 주지 않는다.
 */
export function badgesFor(rows: ScoreRow[]): Badge[] {
  const out: Badge[] = [];
  const active = rows.filter((r) => r.assigned > 0);
  if (!active.length) return out;

  const top = active[0];
  if (top.points > 0 && (active[1] === undefined || top.points > active[1].points)) {
    out.push({ memberId: top.memberId, emoji: '👑', label: '살림왕', why: `${top.points}점으로 1위` });
  }

  const punctual = active
    .filter((r) => r.done >= 3)
    .sort((a, b) => b.onTime / b.done - a.onTime / a.done || b.done - a.done)[0];
  if (punctual && punctual.onTime === punctual.done) {
    out.push({
      memberId: punctual.memberId,
      emoji: '⏰',
      label: '정시왕',
      why: `맡은 ${punctual.done}가지를 모두 제시간에`,
    });
  }

  for (const r of active) {
    if (r.assigned >= 3 && r.done === r.assigned) {
      out.push({ memberId: r.memberId, emoji: '🔥', label: '개근', why: `${r.assigned}가지를 하나도 안 남김` });
    }
    if (r.stars.length >= 3) {
      const avg = r.stars.reduce((a, b) => a + b, 0) / r.stars.length;
      if (avg >= 4.5) {
        out.push({
          memberId: r.memberId,
          emoji: '🌟',
          label: '별다섯',
          why: `확인 ${r.stars.length}번 평균 ★${avg.toFixed(1)}`,
        });
      }
    }
  }
  return out;
}
