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

export async function getPlans(): Promise<ReadingPlan[]> {
  const { data, error } = await supabase
    .from('reading_plans')
    .select('id, slug, title, description')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getPlanBySlug(
  slug: string
): Promise<{ plan: ReadingPlan; days: ReadingPlanDay[] } | null> {
  const { data: plan, error: planError } = await supabase
    .from('reading_plans')
    .select('id, slug, title, description')
    .eq('slug', slug)
    .single();
  if (planError) throw planError;
  if (!plan) return null;

  const { data: days, error: daysError } = await supabase
    .from('reading_plan_days')
    .select('id, plan_id, day_number, book_id, chapter')
    .eq('plan_id', plan.id)
    .order('day_number', { ascending: true });
  if (daysError) throw daysError;

  return { plan, days: days ?? [] };
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
