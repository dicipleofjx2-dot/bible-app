import { supabase } from '@/lib/supabase';

export type ReadingPlan = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
};

export type ReadingPlanDay = {
  id: string;
  plan_id: string;
  day_number: number;
  book_id: number;
  chapter: number;
};

export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Inclusive day count spanning start..end (e.g. same day = 1). */
export function daysBetweenInclusive(startDateStr: string, endDateStr: string): number {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// The plan list rarely changes, so cache it in memory — repeat visits to the
// plans screen (e.g. via the home screen's "읽기 계획 보기" link) render
// instantly instead of waiting on a fresh network round trip every time.
let plansCache: ReadingPlan[] | null = null;
let plansCachePromise: Promise<ReadingPlan[]> | null = null;

async function fetchPlans(): Promise<ReadingPlan[]> {
  const { data, error } = await supabase
    .from('reading_plans')
    .select('id, slug, title, description, start_date, end_date, created_by')
    .order('created_at', { ascending: true });
  if (error) {
    plansCachePromise = null;
    throw error;
  }
  plansCache = data ?? [];
  return plansCache;
}

export async function getPlans(): Promise<ReadingPlan[]> {
  if (plansCache) return plansCache;
  if (!plansCachePromise) plansCachePromise = fetchPlans();
  return plansCachePromise;
}

function invalidatePlansCache() {
  plansCache = null;
  plansCachePromise = null;
}

/** Warms the plans cache ahead of navigation, e.g. from the home screen. */
export function prefetchPlans() {
  getPlans().catch(() => {});
}

/** Resolves a slug to a plan via the (usually already-warm) plans cache,
 * avoiding an extra network round trip on the common navigation path. */
export async function findPlanBySlug(slug: string): Promise<ReadingPlan | null> {
  const plans = await getPlans();
  return plans.find((p) => p.slug === slug) ?? null;
}

export async function findPlanById(planId: string): Promise<ReadingPlan | null> {
  const plans = await getPlans();
  return plans.find((p) => p.id === planId) ?? null;
}

export async function getPlanDays(planId: string): Promise<ReadingPlanDay[]> {
  const { data, error } = await supabase
    .from('reading_plan_days')
    .select('id, plan_id, day_number, book_id, chapter')
    .eq('plan_id', planId)
    .order('day_number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCompletedDays(planId: string): Promise<Set<number>> {
  const { data, error } = await supabase
    .from('reading_plan_progress')
    .select('day_number')
    .eq('plan_id', planId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.day_number));
}

export async function setDayComplete(planId: string, dayNumber: number, userId: string) {
  const { error } = await supabase
    .from('reading_plan_progress')
    .upsert(
      { plan_id: planId, day_number: dayNumber, user_id: userId },
      { onConflict: 'user_id,plan_id,day_number', ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function setDayIncomplete(planId: string, dayNumber: number) {
  const { error } = await supabase
    .from('reading_plan_progress')
    .delete()
    .eq('plan_id', planId)
    .eq('day_number', dayNumber);
  if (error) throw error;
}

/** Builds a URL-safe-ish slug from a title plus a random suffix (uniqueness
 * doesn't depend on the title, since users can freely reuse titles). */
function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'plan'}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Spreads `chapters` as evenly as possible across exactly `totalDays` days
 * (some days get one extra chapter rather than leaving a lopsided last day),
 * so day `totalDays`'s calendar date always lands exactly on the plan's
 * end_date. */
function distributeAcrossDays<T>(items: T[], totalDays: number): T[][] {
  const days: T[][] = [];
  const base = Math.floor(items.length / totalDays);
  const extra = items.length % totalDays;
  let idx = 0;
  for (let d = 0; d < totalDays; d++) {
    const count = base + (d < extra ? 1 : 0);
    days.push(items.slice(idx, idx + count));
    idx += count;
  }
  return days;
}

/** Creates a user-authored reading plan: `chapters` is the full flat list of
 * book/chapter pairs in reading order, spread evenly across the calendar
 * days from startDate to endDate (inclusive) — see the 성경통독 tab, which
 * enumerates the chapter range and calls this. */
export async function createPlan(params: {
  title: string;
  createdBy: string;
  chapters: { bookId: number; chapter: number }[];
  startDate: string;
  endDate: string;
}): Promise<ReadingPlan> {
  const totalDays = daysBetweenInclusive(params.startDate, params.endDate);
  if (totalDays < 1) throw new Error('종료일은 시작일보다 뒤여야 합니다.');
  if (params.chapters.length < totalDays) {
    throw new Error(`선택한 범위(${params.chapters.length}장)가 기간(${totalDays}일)보다 짧습니다. 범위를 늘리거나 기간을 줄여주세요.`);
  }

  const { data: plan, error: planError } = await supabase
    .from('reading_plans')
    .insert({
      slug: slugify(params.title),
      title: params.title,
      created_by: params.createdBy,
      start_date: params.startDate,
      end_date: params.endDate,
    })
    .select('id, slug, title, description, start_date, end_date, created_by')
    .single();
  if (planError) throw planError;

  const perDay = distributeAcrossDays(params.chapters, totalDays);
  const days: { plan_id: string; day_number: number; book_id: number; chapter: number }[] = [];
  perDay.forEach((chaptersForDay, i) => {
    for (const c of chaptersForDay) {
      days.push({ plan_id: plan.id, day_number: i + 1, book_id: c.bookId, chapter: c.chapter });
    }
  });
  const { error: daysError } = await supabase.from('reading_plan_days').insert(days);
  if (daysError) throw daysError;

  invalidatePlansCache();
  return plan;
}

/** Deletes a plan the caller owns (enforced by RLS). Cascades in the DB take
 * out its days, progress, and any room built on it — see the `on delete
 * cascade` FKs on reading_plan_days/reading_plan_progress/reading_rooms. */
export async function deletePlan(planId: string): Promise<void> {
  const { error } = await supabase.from('reading_plans').delete().eq('id', planId);
  if (error) throw error;
  invalidatePlansCache();
}

export type TodaysReading = {
  planId: string;
  planTitle: string;
  dayNumber: number;
  totalDays: number;
  entries: { bookId: number; chapters: number[] }[];
};

/** For a plan with a start_date, resolves which day_number today falls on and
 * returns that day's chapters grouped by book — used to show "오늘의 성경통독"
 * in 말씀묵상 for anyone who has joined a room following this plan. */
export async function getTodaysReadingForPlan(planId: string): Promise<TodaysReading | null> {
  const plan = await findPlanById(planId);
  if (!plan?.start_date || !plan.end_date) return null;

  const today = todayDateString();
  if (today < plan.start_date || today > plan.end_date) return null;

  const dayNumber = daysBetweenInclusive(plan.start_date, today);
  const totalDays = daysBetweenInclusive(plan.start_date, plan.end_date);

  const { data, error } = await supabase
    .from('reading_plan_days')
    .select('book_id, chapter')
    .eq('plan_id', planId)
    .eq('day_number', dayNumber)
    .order('book_id', { ascending: true })
    .order('chapter', { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const byBook = new Map<number, number[]>();
  for (const row of data) {
    const list = byBook.get(row.book_id);
    if (list) list.push(row.chapter);
    else byBook.set(row.book_id, [row.chapter]);
  }
  const entries = Array.from(byBook.entries()).map(([bookId, chapters]) => ({ bookId, chapters }));

  return { planId, planTitle: plan.title, dayNumber, totalDays, entries };
}

export type PlanDayMatch = { planId: string; planTitle: string; dayNumber: number };

/** Finds every reading-plan day that points at this exact book+chapter, across all plans. */
export async function getPlanDaysForChapter(bookId: number, chapter: number): Promise<PlanDayMatch[]> {
  const { data, error } = await supabase
    .from('reading_plan_days')
    .select('plan_id, day_number, reading_plans(title)')
    .eq('book_id', bookId)
    .eq('chapter', chapter);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    planId: row.plan_id,
    dayNumber: row.day_number,
    planTitle: row.reading_plans?.title ?? '',
  }));
}
