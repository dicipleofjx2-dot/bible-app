import { supabase } from '@/lib/supabase';

export type ReadingPlan = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

export type ReadingPlanDay = {
  id: string;
  plan_id: string;
  day_number: number;
  book_id: number;
  chapter: number;
};

// The plan list rarely changes, so cache it in memory — repeat visits to the
// plans screen (e.g. via the home screen's "읽기 계획 보기" link) render
// instantly instead of waiting on a fresh network round trip every time.
let plansCache: ReadingPlan[] | null = null;
let plansCachePromise: Promise<ReadingPlan[]> | null = null;

async function fetchPlans(): Promise<ReadingPlan[]> {
  const { data, error } = await supabase
    .from('reading_plans')
    .select('id, slug, title, description')
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

/** Creates a user-authored reading plan: `chapters` is the full flat list of
 * book/chapter pairs in reading order, chunked into `chaptersPerDay`-sized
 * days (see the 성경통독 tab, which enumerates the chapter range and calls
 * this). */
export async function createPlan(params: {
  title: string;
  createdBy: string;
  chapters: { bookId: number; chapter: number }[];
  chaptersPerDay: number;
}): Promise<ReadingPlan> {
  const { data: plan, error: planError } = await supabase
    .from('reading_plans')
    .insert({ slug: slugify(params.title), title: params.title, created_by: params.createdBy })
    .select('id, slug, title, description')
    .single();
  if (planError) throw planError;

  const days: { plan_id: string; day_number: number; book_id: number; chapter: number }[] = [];
  for (let i = 0; i < params.chapters.length; i += params.chaptersPerDay) {
    const dayNumber = Math.floor(i / params.chaptersPerDay) + 1;
    for (const c of params.chapters.slice(i, i + params.chaptersPerDay)) {
      days.push({ plan_id: plan.id, day_number: dayNumber, book_id: c.bookId, chapter: c.chapter });
    }
  }
  const { error: daysError } = await supabase.from('reading_plan_days').insert(days);
  if (daysError) throw daysError;

  plansCache = null;
  return plan;
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
