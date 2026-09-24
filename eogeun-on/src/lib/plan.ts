import { diffDays, isWeekend } from './day.ts';
import { GRADES } from './grades.ts';
import type { Cards, Profile, Word } from './types.ts';

/**
 * 오늘 무엇을 할지(§2·§3·§6).
 *
 * - 한 세션은 **25분 안팎**을 잡는다. 복습을 먼저 채우고 남는 시간에 새 단어를 넣는다.
 * - 복습이 많으면 새 단어가 0 이 될 수도 있다 — 그게 맞다(§3 「예정된 복습을 우선」).
 * - 밀린 날에는 오래된 카드부터 **소량씩** 꺼낸다(§4.2). 한 번에 다 쏟으면
 *   다음 날 또 쌓인다.
 * - 토·일은 새 단어 없이 주간 점검이다(§6): 그 주의 약점 + 지난 단어 몇 개.
 */

export const BUDGET_SEC = 25 * 60;
export const REVIEW_SEC = 20;
export const NEW_SEC = 80;
/** 하루에 꺼내는 복습 상한 — 밀린 날 복구도 이만큼씩. */
export const REVIEW_CAP = 45;

export interface DailyPlan {
  day: string;
  weekend: boolean;
  reviewIds: string[];
  newIds: string[];
  minutes: number;
  /** 밀려서 오늘 못 꺼낸 복습 수. */
  backlog: number;
}

export function pickNewWords(words: Word[], cards: Cards, profile: Profile, n: number): string[] {
  if (n <= 0) return [];
  const pool = words.filter((w) => w.grade === profile.grade && !cards[w.id]);
  // 진단이 정한 난도부터, 같은 난도 안에서는 바탕 단어가 파생어보다 먼저.
  const rank = (w: Word) => ((w.level - profile.startLevel + 3) % 3) * 2 + (w.base ? 1 : 0);
  const sorted = pool.map((w, i) => ({ w, i })).sort((a, b) => rank(a.w) - rank(b.w) || a.i - b.i).map((x) => x.w);

  const picked: string[] = [];
  const has = (id: string) => !!cards[id] || picked.includes(id);
  for (const w of sorted) {
    if (picked.length >= n) break;
    if (has(w.id)) continue;
    // 파생어를 고르면 그 바탕 단어를 먼저 넣는다(write → rewrite, §4.3).
    if (w.base && !has(w.base) && pool.some((p) => p.id === w.base)) {
      if (picked.length + 2 > n) continue;
      picked.push(w.base);
    }
    picked.push(w.id);
  }
  return picked;
}

export function buildPlan(day: string, words: Word[], cards: Cards, profile: Profile): DailyPlan {
  const weekend = isWeekend(day);
  const all = Object.values(cards);
  const due = all.filter((c) => c.due <= day).sort((a, b) => a.due.localeCompare(b.due) || b.lapses - a.lapses);

  let reviewIds = due.slice(0, REVIEW_CAP).map((c) => c.id);
  const backlog = Math.max(0, due.length - REVIEW_CAP);

  if (weekend) {
    // 이번 주에 틀린 카드와, 오래 안 본 카드 몇 장을 섞는다.
    const weak = all.filter((c) => c.history.some((a) => !a.ok && diffDays(day, a.day) <= 6)).map((c) => c.id);
    const old = all
      .filter((c) => c.lastOk && diffDays(day, c.lastOk) >= 7)
      .sort((a, b) => (a.lastOk ?? '').localeCompare(b.lastOk ?? ''))
      .slice(0, 8)
      .map((c) => c.id);
    reviewIds = [...new Set([...reviewIds, ...weak, ...old])].slice(0, REVIEW_CAP);
    return { day, weekend, reviewIds, newIds: [], minutes: minutesFor(reviewIds.length, 0), backlog };
  }

  const g = GRADES[profile.grade];
  const left = BUDGET_SEC - reviewIds.length * REVIEW_SEC;
  const max = Math.max(0, g.newMax + profile.newAdjust);
  const n = Math.max(0, Math.min(max, Math.floor(left / NEW_SEC)));
  const newIds = pickNewWords(words, cards, profile, n);
  return { day, weekend, reviewIds, newIds, minutes: minutesFor(reviewIds.length, newIds.length), backlog };
}

export function minutesFor(reviews: number, news: number): number {
  return Math.max(1, Math.round((reviews * REVIEW_SEC + news * NEW_SEC) / 60));
}
