/** 금액·날짜를 사람이 읽는 꼴로. 화면 여러 곳이 같은 꼴을 쓰도록 한곳에 둔다. */

export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** 큰 금액을 한눈에 — 1,234,567원 → 123만원 */
export function formatShortWon(amount: number): string {
  if (Math.abs(amount) >= 100000000) return `${Math.round(amount / 10000000) / 10}억원`;
  if (Math.abs(amount) >= 10000) return `${Math.round(amount / 10000).toLocaleString('ko-KR')}만원`;
  return formatWon(amount);
}

/** 'YYYY-MM-DD' → 'YYYY-MM' */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function thisMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' 을 n달 앞뒤로 옮긴다. */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return `${year}년 ${mon}월`;
}

export function dayLabel(date: string): string {
  const [, mon, day] = date.split('-').map(Number);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(date + 'T00:00:00').getDay()];
  return `${mon}월 ${day}일 (${weekday})`;
}
