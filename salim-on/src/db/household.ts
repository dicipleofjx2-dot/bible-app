import { supabase } from '@/lib/supabase';
import type { Chore, RepeatKind, TaskStatus } from '@/lib/chores';
import { datesFor, normalizeTime } from '@/lib/chores';

/**
 * 표에 닿는 자리는 전부 여기다.
 *
 * 화면에서 supabase 를 직접 부르지 않는다 — 표 이름이나 칸이 바뀔 때 고칠
 * 자리가 열 곳으로 흩어지면, 한 곳을 빠뜨린 채로 배포된다.
 */

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  week_start: number;
  grace_min: number;
  my_role: 'manager' | 'member';
  my_member_id: string;
};

export type Member = {
  id: string;
  household_id: string;
  user_id: string | null;
  display_name: string;
  emoji: string;
  role: 'manager' | 'member';
  active: boolean;
};

export type Category = {
  id: string;
  household_id: string;
  name: string;
  emoji: string;
  sort_order: number;
};

export type ChoreRow = Chore & { household_id: string; notes: string };

export type Task = {
  id: string;
  household_id: string;
  chore_id: string;
  member_id: string | null;
  on_date: string;
  at_time: string;
  status: TaskStatus;
  quality: number | null;
  review_note: string;
  reviewer_id: string | null;
  done_at: string | null;
  reviewed_at: string | null;
  late_minutes: number | null;
  points: number;
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

// ── 집 ──────────────────────────────────────────────────────────────

export async function myHouseholds(): Promise<Household[]> {
  return unwrap<Household[]>(await supabase.rpc('home_my_households'));
}

export async function createHousehold(name: string, myName: string): Promise<string> {
  const { data, error } = await supabase.rpc('home_create_household', {
    p_name: name,
    p_my_name: myName,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function joinHousehold(code: string, myName: string): Promise<string> {
  const { data, error } = await supabase.rpc('home_join_household', {
    p_code: code,
    p_my_name: myName,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function renameHousehold(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('home_households').update({ name }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ── 식구 ────────────────────────────────────────────────────────────

export async function listMembers(householdId: string): Promise<Member[]> {
  return unwrap<Member[]>(
    await supabase
      .from('home_members')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at')
  );
}

export async function addMember(
  householdId: string,
  displayName: string,
  emoji: string,
  role: 'manager' | 'member'
): Promise<void> {
  const { error } = await supabase
    .from('home_members')
    .insert({ household_id: householdId, display_name: displayName, emoji, role });
  if (error) throw new Error(error.message);
}

export async function updateMember(id: string, patch: Partial<Member>): Promise<void> {
  const { error } = await supabase.from('home_members').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * 식구를 뺄 때 **줄을 지우지 않고 재운다**(active=false). 지우면 그 사람이 한
 * 일감의 담당자가 통째로 비어, 지난 점수판이 유령이 된다.
 */
export async function retireMember(id: string): Promise<void> {
  await updateMember(id, { active: false });
}

// ── 분류 ────────────────────────────────────────────────────────────

export async function listCategories(householdId: string): Promise<Category[]> {
  return unwrap<Category[]>(
    await supabase
      .from('home_categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order')
  );
}

export async function addCategory(householdId: string, name: string, emoji: string, sortOrder: number) {
  const { error } = await supabase
    .from('home_categories')
    .insert({ household_id: householdId, name, emoji, sort_order: sortOrder });
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('home_categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── 집안일 ──────────────────────────────────────────────────────────

export async function listChores(householdId: string): Promise<ChoreRow[]> {
  return unwrap<ChoreRow[]>(
    await supabase
      .from('home_chores')
      .select('*')
      .eq('household_id', householdId)
      .order('at_time')
  );
}

export type ChoreDraft = {
  title: string;
  notes: string;
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

export async function saveChore(householdId: string, draft: ChoreDraft, id?: string): Promise<void> {
  const row = { ...draft, at_time: normalizeTime(draft.at_time), household_id: householdId };
  const { error } = id
    ? await supabase.from('home_chores').update(row).eq('id', id)
    : await supabase.from('home_chores').insert(row);
  if (error) throw new Error(error.message);
}

export async function deleteChore(id: string): Promise<void> {
  const { error } = await supabase.from('home_chores').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── 그날의 일감 ─────────────────────────────────────────────────────

export async function listTasks(householdId: string, from: string, to: string): Promise<Task[]> {
  return unwrap<Task[]>(
    await supabase
      .from('home_tasks')
      .select('*')
      .eq('household_id', householdId)
      .gte('on_date', from)
      .lte('on_date', to)
      .order('on_date')
      .order('at_time')
  );
}

/**
 * 그 기간의 일감을 표에 펼친다.
 *
 * **이미 있는 일감은 건드리지 않는다**(chore_id + 날짜에 유일 제약이 걸려
 * 있고 `ignoreDuplicates`). 한 번 더 눌렀다고 누가 끝낸 표시나 바꿔 둔
 * 담당자가 되돌아가면, 아무도 이 단추를 못 누른다.
 *
 * 돌려주는 값은 **새로 생긴 줄 수**다.
 */
export async function generateTasks(
  householdId: string,
  chores: ChoreRow[],
  from: string,
  to: string
): Promise<number> {
  const rows = chores.flatMap((chore) =>
    datesFor(chore, from, to).map((date) => ({
      household_id: householdId,
      chore_id: chore.id,
      member_id: chore.default_member_id,
      on_date: date,
      at_time: chore.at_time,
    }))
  );
  if (!rows.length) return 0;
  const { data, error } = await supabase
    .from('home_tasks')
    .upsert(rows, { onConflict: 'chore_id,on_date', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase.from('home_tasks').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function assignTask(id: string, memberId: string | null): Promise<void> {
  const { error } = await supabase.from('home_tasks').update({ member_id: memberId }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** 자동 배정의 결과를 한꺼번에 적는다. 한 줄씩 보내면 중간에 끊긴 채 남는다. */
export async function assignMany(pairs: { id: string; memberId: string }[]): Promise<void> {
  for (const chunk of chunked(pairs, 50)) {
    const results = await Promise.all(
      chunk.map((p) => supabase.from('home_tasks').update({ member_id: p.memberId }).eq('id', p.id))
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }
}

function chunked<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export async function reviewTask(
  id: string,
  reviewerId: string,
  quality: number,
  approved: boolean,
  note: string
): Promise<void> {
  const { error } = await supabase
    .from('home_tasks')
    .update({
      status: approved ? 'approved' : 'rejected',
      quality,
      review_note: note,
      reviewer_id: reviewerId,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
