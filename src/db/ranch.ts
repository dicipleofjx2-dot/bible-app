import { supabase } from '@/lib/supabase';
import type { RanchCounts, RanchPoints } from '@/lib/ranch';

async function count(
  table: string,
  cellId: string,
  filter?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<number> {
  let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('cell_id', cellId);
  if (filter) q = filter(q);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

/**
 * 활동 점수 합계(예배·목장·기도·통독). 0089 가 아직 안 올라갔거나 읽지 못하면 null —
 * 그러면 방주는 예전처럼 목장 글 수만으로 자란다.
 */
export async function getRanchPoints(cellId: string, onlyMe = false): Promise<RanchPoints | null> {
  const { data, error } = await supabase.rpc('ranch_activity', { p_cell: cellId, p_only_me: onlyMe });
  if (error) return null;
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, number> | undefined;
  if (!r) return null;
  return {
    sunday: r.sunday ?? 0,
    midweek: r.midweek ?? 0,
    cell: r.cell ?? 0,
    prayerMinutes: r.prayer_minutes ?? 0,
    chapters: r.chapters ?? 0,
    lastPrayerMinutes: r.last_prayer_minutes ?? 0,
    lastChapters: r.last_chapters ?? 0,
    lastRecorded: r.last_recorded ?? 0,
    membersTotal: r.members_total ?? 0,
    membersActive: r.members_active ?? 0,
  };
}

export type Habit = { userId: string; prayerMinutes: number; chapters: number };

/** 이 모임에서 적은 기도 시간·통독량. 표가 아직 없거나 못 읽으면 빈 목록. */
export async function getHabits(gatheringId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('cell_gathering_habits')
    .select('user_id, prayer_minutes, chapters')
    .eq('gathering_id', gatheringId);
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    userId: String(r.user_id),
    prayerMinutes: Number(r.prayer_minutes ?? 0),
    chapters: Number(r.chapters ?? 0),
  }));
}

export async function saveHabits(
  gatheringId: string,
  recordedBy: string,
  rows: Habit[],
): Promise<{ error: string | null }> {
  if (rows.length === 0) return { error: null };
  const { error } = await supabase.from('cell_gathering_habits').upsert(
    rows.map((h) => ({
      gathering_id: gatheringId,
      user_id: h.userId,
      prayer_minutes: h.prayerMinutes,
      chapters: h.chapters,
      recorded_by: recordedBy,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'gathering_id,user_id' },
  );
  return { error: error?.message ?? null };
}

export type EvangelismStatus = 'watching' | 'claimed' | 'approved' | 'rejected' | 'paid';

export type Evangelism = {
  id: string;
  cellId: string;
  cellName: string;
  newcomerMemberId: string;
  newcomerName: string;
  referrerName: string | null;
  registeredOn: string;
  status: EvangelismStatus;
  settledDays: number;
  amountEvangelism: number | null;
  amountGrowth: number | null;
  decisionNote: string | null;
};

/** 목장의 기록(cellId) 또는 교회 관리자의 전체 기록(null). 못 읽으면 null. */
export async function getEvangelism(cellId: string | null): Promise<Evangelism[] | null> {
  const { data, error } = await supabase.rpc('ranch_evangelism_list', { p_cell: cellId });
  if (error) return null;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    cellId: String(r.cell_id),
    cellName: String(r.cell_name ?? ''),
    newcomerMemberId: String(r.newcomer_member_id),
    newcomerName: String(r.newcomer_name ?? ''),
    referrerName: (r.referrer_name as string | null) ?? null,
    registeredOn: String(r.registered_on),
    status: r.status as EvangelismStatus,
    settledDays: Number(r.settled_days ?? 0),
    amountEvangelism: (r.amount_evangelism as number | null) ?? null,
    amountGrowth: (r.amount_growth as number | null) ?? null,
    decisionNote: (r.decision_note as string | null) ?? null,
  }));
}

const EVANGELISM_ERRORS: Record<string, string> = {
  not_allowed: '이 일을 할 권한이 없어요.',
  newcomer_not_in_cell: '이 목장 교적에 있는 분만 올릴 수 있어요.',
  already_recorded: '이미 기록된 새가족이에요.',
  already_claimed: '이미 신청했어요.',
  not_settled_yet: '아직 정착 기준(8주 중 6번 출석)에 닿지 않았어요.',
  not_claimed: '신청 중인 건이 아니에요.',
  not_approved: '승인된 건이 아니에요.',
  not_found: '기록을 찾지 못했어요.',
};

function evangelismError(message: string | undefined): string | null {
  if (!message) return null;
  const key = Object.keys(EVANGELISM_ERRORS).find((k) => message.includes(k));
  return key ? EVANGELISM_ERRORS[key] : `처리하지 못했어요. ${message}`;
}

export async function addEvangelism(input: {
  cellId: string;
  newcomerMemberId: string;
  referrerMemberId: string | null;
  registeredOn: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('ranch_evangelism_add', {
    p_cell: input.cellId,
    p_newcomer: input.newcomerMemberId,
    p_referrer: input.referrerMemberId,
    p_registered_on: input.registeredOn,
  });
  return { error: evangelismError(error?.message) };
}

export async function claimEvangelism(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('ranch_evangelism_claim', { p_id: id });
  return { error: evangelismError(error?.message) };
}

export async function decideEvangelism(
  id: string,
  approve: boolean,
  note?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('ranch_evangelism_decide', {
    p_id: id,
    p_approve: approve,
    p_note: note ?? null,
  });
  return { error: evangelismError(error?.message) };
}

export async function markEvangelismPaid(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('ranch_evangelism_mark_paid', { p_id: id });
  return { error: evangelismError(error?.message) };
}

/**
 * 목장이 지금까지 쌓은 활동의 수. 센 것만 돌려주고 글의 내용은 읽지 않는다.
 * 돌봄 기록·양육 표는 일부러 세지 않는다(src/lib/ranch.ts).
 */
export async function getRanchCounts(cellId: string): Promise<RanchCounts> {
  const [gatherings, reports, shares, messages] = await Promise.all([
    count('cell_gatherings', cellId, (q) => q.eq('status', 'closed')),
    count('cell_reports', cellId, (q) => q.is('deleted_at', null)),
    count('cell_shares', cellId, (q) => q.is('deleted_at', null)),
    count('cell_messages', cellId, (q) => q.is('deleted_at', null)),
  ]);
  return { gatherings, reports, shares, messages };
}
