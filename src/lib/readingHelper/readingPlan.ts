import { BIBLE_BOOKS, TOTAL_CHAPTERS } from './bibleBooks';

export const PLAN_TOTAL_DAYS = 365;

export type PlanChapterEntry = { bookId: number; bookName: string; chapter: number };

export type PlanDay = {
  dayNumber: number;
  date: string; // YYYY-MM-DD
  isSunday: boolean;
  chapters: PlanChapterEntry[];
};

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Flattens the 66-book canon into one chapter-per-entry list in reading order. */
function flattenChapters(): PlanChapterEntry[] {
  const out: PlanChapterEntry[] = [];
  for (const book of BIBLE_BOOKS) {
    for (let c = 1; c <= book.chapters; c++) {
      out.push({ bookId: book.id, bookName: book.name, chapter: c });
    }
  }
  return out;
}

/**
 * Builds the full 365-day plan anchored to `startDateStr` (the day the user
 * tapped 통독 시작하기, i.e. Day 1). Weekday = 3 chapters/day, Sunday = 5
 * chapters/day, per the spec — this averages ~3.26 chapters/day, close to
 * TOTAL_CHAPTERS/365 (~3.26), so the plan reaches Revelation right around
 * day 365 without needing manual balancing.
 */
export function buildFullPlan(startDateStr: string): PlanDay[] {
  const allChapters = flattenChapters();
  const days: PlanDay[] = [];
  let idx = 0;
  const start = new Date(`${startDateStr}T00:00:00`);

  for (let dayNumber = 1; dayNumber <= PLAN_TOTAL_DAYS && idx < allChapters.length; dayNumber++) {
    const date = new Date(start);
    date.setDate(date.getDate() + (dayNumber - 1));
    const isSunday = date.getDay() === 0;
    const count = isSunday ? 5 : 3;
    const chapters = allChapters.slice(idx, idx + count);
    idx += count;
    days.push({ dayNumber, date: toDateString(date), isSunday, chapters });
  }

  // Whatever's left (the plan runs a little short of 365 days at 3/5-per-day
  // pacing vs. TOTAL_CHAPTERS) gets appended to the final day rather than
  // silently dropped.
  if (idx < allChapters.length && days.length > 0) {
    days[days.length - 1].chapters.push(...allChapters.slice(idx));
  }

  return days;
}

/** The reading plan's daily refresh happens at 오전 4시, not midnight — so
 * "today" for every day-boundary calculation (which Day N is showing, which
 * date a quiz score/completion gets recorded under, which calendar cell is
 * highlighted) should still read as "yesterday" until 4am rolls around. */
export const DAY_START_HOUR = 4;

export function todayDateString(): string {
  const shifted = new Date(Date.now() - DAY_START_HOUR * 60 * 60 * 1000);
  return toDateString(shifted);
}

/** Milliseconds until the next 4am boundary (i.e. until `todayDateString()`
 * will next change) — used to schedule an in-app auto-refresh so a screen
 * left open overnight flips to the new day without needing to be reopened. */
export function msUntilNextDayStart(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(DAY_START_HOUR, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

/** Inclusive day count spanning start..end (e.g. same day = 1). */
export function daysBetweenInclusive(startDateStr: string, endDateStr: string): number {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

/** The day number `dateStr` falls on relative to startDate, clamped to
 * [1, PLAN_TOTAL_DAYS] — used both for "today" and for jumping back to a
 * past date (e.g. reviewing an earlier day's quiz from the archive). */
export function dayNumberForDate(startDateStr: string, dateStr: string): number {
  const n = daysBetweenInclusive(startDateStr, dateStr);
  return Math.min(Math.max(n, 1), PLAN_TOTAL_DAYS);
}

/** Today's day number since startDate, clamped to [1, PLAN_TOTAL_DAYS]. */
export function currentDayNumber(startDateStr: string): number {
  return dayNumberForDate(startDateStr, todayDateString());
}

export function formatChapterRange(chapters: PlanChapterEntry[]): string {
  if (chapters.length === 0) return '';
  // Group consecutive entries by book, e.g. "창세기 1~5장" or "창세기 48~50장, 출애굽기 1~2장"
  const groups: { bookName: string; start: number; end: number }[] = [];
  for (const c of chapters) {
    const last = groups[groups.length - 1];
    if (last && last.bookName === c.bookName && c.chapter === last.end + 1) {
      last.end = c.chapter;
    } else {
      groups.push({ bookName: c.bookName, start: c.chapter, end: c.chapter });
    }
  }
  return groups
    .map((g) => (g.start === g.end ? `${g.bookName} ${g.start}장` : `${g.bookName} ${g.start}~${g.end}장`))
    .join(', ');
}
