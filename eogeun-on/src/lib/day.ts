/**
 * 날짜는 전부 `YYYY-MM-DD` 문자열로 다룬다. 기록이 기기 안에만 있으므로
 * 기준은 기기의 날짜다 — 한국에서 쓰면 한국 자정에 하루가 넘어간다.
 * 문자열 비교가 곧 날짜 비교가 되도록 자릿수를 맞춘다.
 */

export function toDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function today(): string {
  return toDay(new Date());
}

function parse(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // 한낮으로 잡아 서머타임 경계에서 날이 밀리지 않게
}

export function addDays(day: string, n: number): string {
  const d = parse(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86_400_000);
}

/** 0=일 … 6=토 */
export function weekday(day: string): number {
  return parse(day).getDay();
}

export function isWeekend(day: string): boolean {
  const w = weekday(day);
  return w === 0 || w === 6;
}

/** 이 날 다음에 오는 토요일(하루 뒤보다는 뒤). 주간 점검 칸이 쓴다. */
export function nextSaturday(day: string): string {
  let n = (6 - weekday(day) + 7) % 7;
  if (n < 2) n += 7;
  return addDays(day, n);
}

/** 그 주의 토요일 — 한 주에 한 번 하는 일의 표식. */
export function weekKey(day: string): string {
  return addDays(day, (6 - weekday(day) + 7) % 7);
}
