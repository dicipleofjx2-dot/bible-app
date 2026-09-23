import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';
import { STORAGE_CACHE_SECONDS } from '@/lib/storageCache';

/**
 * 목장마을ON — 「작은 교회」(목장)의 방들과, 목장들이 모인 「마을」.
 *
 * 표와 정책은 supabase/migrations/0085_village_on.sql 에 있고, 여기서는 읽고
 * 쓰기만 한다. **권한 판단을 여기서 다시 하지 않는다** — 0065 가 정한 대로,
 * 같은 규칙이 화면과 정책 두 군데 있으면 반드시 어긋난다. 화면은 단추를
 * 감추는 데만 쓰고, 막는 것은 DB 가 한다.
 *
 * 목장 자체(누가 어느 목장인지, 목자가 누구인지)는 `@/db/cell` 이 맡는다.
 * 마을은 교적의 교구(org_units.parent_id)를 그대로 쓴다.
 */

// ════════════════════════════════════════════════════════════════════
// 마을
// ════════════════════════════════════════════════════════════════════

export type Village = {
  /** 교구를 안 나눈 교회는 null. 그때는 교회 전체가 한 마을이다. */
  id: string | null;
  name: string;
};

export type StreetCell = {
  cellId: string;
  cellName: string;
  memberCount: number;
  leaderName: string | null;
  nextMeetOn: string | null;
  nextMeetTitle: string | null;
};

/** 내 마을. 교구가 없으면 id 가 null 인 「우리 교회 마을」을 돌려준다. */
export async function getMyVillage(): Promise<Village> {
  const { data } = await supabase.rpc('my_village_id');
  const id = (data as string | null) ?? null;
  if (!id) return { id: null, name: '우리 마을' };
  const { data: unit } = await supabase
    .from('org_units')
    .select('name')
    .eq('id', id)
    .maybeSingle();
  return { id, name: String((unit as { name?: string } | null)?.name ?? '우리 마을') };
}

/** 마을장인지 — 승인 단추를 보일지 정한다. 막는 것은 정책이 한다. */
export async function amVillageLeader(villageId: string | null): Promise<boolean> {
  const { data } = await supabase.rpc('is_village_leader_of', { target_village_id: villageId });
  return data === true;
}

/**
 * 목장 거리 — 이 마을의 목장 건물 카드.
 *
 * 목장마다 따로 묻지 않는다. 새부대교회는 목장이 11개라 왕복이 11번 생긴다.
 */
export async function getVillageStreet(villageId: string | null): Promise<StreetCell[]> {
  const { data, error } = await supabase.rpc('village_street', { target_village_id: villageId });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    cellId: String(r.cell_id),
    cellName: String(r.cell_name ?? ''),
    memberCount: Number(r.member_count ?? 0),
    leaderName: (r.leader_name as string | null) ?? null,
    nextMeetOn: (r.next_meet_on as string | null) ?? null,
    nextMeetTitle: (r.next_meet_title as string | null) ?? null,
  }));
}

// ════════════════════════════════════════════════════════════════════
// 예배당 — 모임
// ════════════════════════════════════════════════════════════════════

export type GatheringStep = {
  kind: 'praise' | 'word' | 'question' | 'prayer' | 'notice';
  title: string;
  body?: string;
};

export type Gathering = {
  id: string;
  cellId: string;
  title: string;
  meetOn: string;
  startTime: string | null;
  placeKind: 'home' | 'church' | 'online' | 'other';
  place: string | null;
  scripture: string | null;
  materialSource: string | null;
  steps: GatheringStep[];
  status: 'planned' | 'running' | 'closed';
  summary: string | null;
  nextCare: string | null;
  createdBy: string;
};

const STEP_KINDS: GatheringStep['kind'][] = ['praise', 'word', 'question', 'prayer', 'notice'];

/** jsonb 는 무엇이든 들어올 수 있다. 화면에 닿기 전에 여기서 걸러 둔다. */
function parseSteps(raw: unknown): GatheringStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      const kind = STEP_KINDS.includes(o.kind as GatheringStep['kind'])
        ? (o.kind as GatheringStep['kind'])
        : 'word';
      return { kind, title: String(o.title ?? ''), body: o.body ? String(o.body) : undefined };
    })
    .filter((s) => s.title.length > 0);
}

function toGathering(r: Record<string, unknown>): Gathering {
  return {
    id: String(r.id),
    cellId: String(r.cell_id),
    title: String(r.title ?? ''),
    meetOn: String(r.meet_on),
    startTime: (r.start_time as string | null) ?? null,
    placeKind: (['home', 'church', 'online', 'other'] as const).includes(r.place_kind as 'home')
      ? (r.place_kind as Gathering['placeKind'])
      : 'home',
    place: (r.place as string | null) ?? null,
    scripture: (r.scripture as string | null) ?? null,
    materialSource: (r.material_source as string | null) ?? null,
    steps: parseSteps(r.steps),
    status: r.status === 'running' ? 'running' : r.status === 'closed' ? 'closed' : 'planned',
    summary: (r.summary as string | null) ?? null,
    nextCare: (r.next_care as string | null) ?? null,
    createdBy: String(r.created_by),
  };
}

const GATHERING_COLS =
  'id, cell_id, title, meet_on, start_time, place_kind, place, scripture, material_source, steps, status, summary, next_care, created_by';

export async function getGatherings(cellId: string, limit = 20): Promise<Gathering[]> {
  const { data, error } = await supabase
    .from('cell_gatherings')
    .select(GATHERING_COLS)
    .eq('cell_id', cellId)
    .is('deleted_at', null)
    .order('meet_on', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => toGathering(r as Record<string, unknown>));
}

/**
 * 목장 현관에 띄울 「이번 모임」.
 *
 * 진행 중인 모임이 있으면 그것이 먼저다. 없으면 오늘 이후로 가장 가까운 모임,
 * 그것도 없으면 가장 최근에 끝난 모임(기록을 적으러 들어간다).
 */
export function pickCurrentGathering(list: Gathering[], today: string): Gathering | null {
  const running = list.find((g) => g.status === 'running');
  if (running) return running;
  const upcoming = list.filter((g) => g.meetOn >= today).sort((a, b) => a.meetOn.localeCompare(b.meetOn));
  if (upcoming.length > 0) return upcoming[0];
  return list[0] ?? null;
}

export async function getGathering(id: string): Promise<Gathering | null> {
  const { data, error } = await supabase
    .from('cell_gatherings')
    .select(GATHERING_COLS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) return null;
  return toGathering(data as Record<string, unknown>);
}

export async function createGathering(input: {
  cellId: string;
  createdBy: string;
  title: string;
  meetOn: string;
  startTime?: string;
  placeKind?: Gathering['placeKind'];
  place?: string;
  scripture?: string;
  materialSource?: string;
  steps?: GatheringStep[];
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('cell_gatherings')
    .insert({
      cell_id: input.cellId,
      created_by: input.createdBy,
      title: input.title,
      meet_on: input.meetOn,
      start_time: input.startTime || null,
      place_kind: input.placeKind ?? 'home',
      place: input.place || null,
      scripture: input.scripture || null,
      material_source: input.materialSource || null,
      steps: input.steps ?? DEFAULT_STEPS,
    })
    .select('id')
    .maybeSingle();
  return { id: data ? String((data as { id: string }).id) : null, error: error?.message ?? null };
}

/**
 * 모임 순서의 기본값.
 *
 * 빈 모임을 만들어 두면 목자가 처음부터 다 적어야 한다. 대부분의 목장모임이
 * 이 차례라, 채워 두고 고치게 한다.
 */
export const DEFAULT_STEPS: GatheringStep[] = [
  { kind: 'praise', title: '찬양' },
  { kind: 'prayer', title: '마음 열기 기도' },
  { kind: 'word', title: '말씀 나누기' },
  { kind: 'question', title: '나눔 질문' },
  { kind: 'prayer', title: '중보기도' },
  { kind: 'notice', title: '광고와 마무리' },
];

export async function updateGathering(
  id: string,
  patch: Partial<{
    title: string;
    meetOn: string;
    startTime: string | null;
    placeKind: Gathering['placeKind'];
    place: string | null;
    scripture: string | null;
    materialSource: string | null;
    steps: GatheringStep[];
    status: Gathering['status'];
    summary: string | null;
    nextCare: string | null;
  }>,
): Promise<{ error: string | null }> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.meetOn !== undefined) row.meet_on = patch.meetOn;
  if (patch.startTime !== undefined) row.start_time = patch.startTime;
  if (patch.placeKind !== undefined) row.place_kind = patch.placeKind;
  if (patch.place !== undefined) row.place = patch.place;
  if (patch.scripture !== undefined) row.scripture = patch.scripture;
  if (patch.materialSource !== undefined) row.material_source = patch.materialSource;
  if (patch.steps !== undefined) row.steps = patch.steps;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.nextCare !== undefined) row.next_care = patch.nextCare;
  const { error } = await supabase.from('cell_gatherings').update(row).eq('id', id);
  return { error: error?.message ?? null };
}

export async function removeGathering(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cell_gatherings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

// ── 참석 ────────────────────────────────────────────────────────────

export type Attendance = {
  userId: string;
  reply: 'going' | 'maybe' | 'absent' | null;
  attended: boolean | null;
  note: string | null;
};

export async function getAttendance(gatheringId: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('cell_gathering_attendance')
    .select('user_id, reply, attended, note')
    .eq('gathering_id', gatheringId);
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    userId: String(r.user_id),
    reply: (r.reply as Attendance['reply']) ?? null,
    attended: (r.attended as boolean | null) ?? null,
    note: (r.note as string | null) ?? null,
  }));
}

/**
 * 참석 답과 출석 표시.
 *
 * upsert 를 쓰는 이유: 답을 바꾸는 일이 흔하다(간다 → 못 간다). 있으면 고치고
 * 없으면 넣는 것을 한 번에 해야 화면이 「이미 냈나」를 먼저 묻지 않는다.
 */
export async function setAttendance(input: {
  gatheringId: string;
  userId: string;
  reply?: 'going' | 'maybe' | 'absent';
  attended?: boolean;
  note?: string | null;
}): Promise<{ error: string | null }> {
  const row: Record<string, unknown> = {
    gathering_id: input.gatheringId,
    user_id: input.userId,
    updated_at: new Date().toISOString(),
  };
  if (input.reply !== undefined) row.reply = input.reply;
  if (input.attended !== undefined) row.attended = input.attended;
  if (input.note !== undefined) row.note = input.note;
  const { error } = await supabase
    .from('cell_gathering_attendance')
    .upsert(row, { onConflict: 'gathering_id,user_id' });
  return { error: error?.message ?? null };
}

// ════════════════════════════════════════════════════════════════════
// 소그룹실 — 나눔
// ════════════════════════════════════════════════════════════════════

export type Share = {
  id: string;
  cellId: string;
  gatheringId: string | null;
  authorId: string;
  question: string | null;
  body: string;
  audience: 'cell' | 'leader';
  createdAt: string;
  comments: ShareComment[];
};

export type ShareComment = {
  id: string;
  shareId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export async function getShares(cellId: string, limit = 40): Promise<Share[]> {
  const { data, error } = await supabase
    .from('cell_shares')
    .select('id, cell_id, gathering_id, author_id, question, body, audience, created_at')
    .eq('cell_id', cellId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const ids = rows.map((r) => String(r.id));
  const comments = ids.length > 0 ? await getShareComments(ids) : new Map<string, ShareComment[]>();
  return rows.map((r) => ({
    id: String(r.id),
    cellId: String(r.cell_id),
    gatheringId: (r.gathering_id as string | null) ?? null,
    authorId: String(r.author_id),
    question: (r.question as string | null) ?? null,
    body: String(r.body ?? ''),
    audience: r.audience === 'leader' ? 'leader' : 'cell',
    createdAt: String(r.created_at),
    comments: comments.get(String(r.id)) ?? [],
  }));
}

/** 댓글은 한 번에 받아 나눈다. 나눔마다 물으면 글 수만큼 왕복이 생긴다. */
async function getShareComments(shareIds: string[]): Promise<Map<string, ShareComment[]>> {
  const map = new Map<string, ShareComment[]>();
  const { data } = await supabase
    .from('cell_share_comments')
    .select('id, share_id, author_id, body, created_at')
    .in('share_id', shareIds)
    .is('deleted_at', null)
    .order('created_at');
  for (const r of ((data ?? []) as Record<string, unknown>[])) {
    const key = String(r.share_id);
    const list = map.get(key) ?? [];
    list.push({
      id: String(r.id),
      shareId: key,
      authorId: String(r.author_id),
      body: String(r.body ?? ''),
      createdAt: String(r.created_at),
    });
    map.set(key, list);
  }
  return map;
}

export async function postShare(input: {
  cellId: string;
  authorId: string;
  body: string;
  question?: string | null;
  gatheringId?: string | null;
  audience?: 'cell' | 'leader';
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_shares').insert({
    cell_id: input.cellId,
    author_id: input.authorId,
    body: input.body,
    question: input.question ?? null,
    gathering_id: input.gatheringId ?? null,
    audience: input.audience ?? 'cell',
  });
  return { error: error?.message ?? null };
}

export async function removeShare(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cell_shares')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function postShareComment(input: {
  shareId: string;
  authorId: string;
  body: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_share_comments').insert({
    share_id: input.shareId,
    author_id: input.authorId,
    body: input.body,
  });
  return { error: error?.message ?? null };
}

// ════════════════════════════════════════════════════════════════════
// 양육실
// ════════════════════════════════════════════════════════════════════

export type Nurture = {
  id: string;
  cellId: string;
  learnerId: string;
  mentorId: string | null;
  course: string;
  stageLabel: string;
  stageKind: 'enrolled' | 'met' | 'ongoing' | 'paused' | 'done';
  nextMeetOn: string | null;
  nextMeetNote: string | null;
  note: string | null;
  celebrate: string | null;
};

export const STAGE_LABELS: { kind: Nurture['stageKind']; label: string }[] = [
  { kind: 'enrolled', label: '등록' },
  { kind: 'met', label: '첫 만남' },
  { kind: 'ongoing', label: '진행 중' },
  { kind: 'paused', label: '쉬어감' },
  { kind: 'done', label: '수료' },
];

/**
 * 내가 볼 수 있는 양육 과정.
 *
 * 정책이 「본인·양육자·교역자」만 열므로, 목원이 불러도 자기 것만 온다. 화면에서
 * 다시 거르지 않는다 — 두 군데서 거르면 한쪽을 고칠 때 다른 쪽이 남는다.
 */
export async function getNurtures(cellId: string): Promise<Nurture[]> {
  const { data, error } = await supabase
    .from('cell_nurtures')
    .select(
      'id, cell_id, learner_id, mentor_id, course, stage_label, stage_kind, next_meet_on, next_meet_note, note, celebrate',
    )
    .eq('cell_id', cellId)
    .is('deleted_at', null)
    .order('next_meet_on', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    cellId: String(r.cell_id),
    learnerId: String(r.learner_id),
    mentorId: (r.mentor_id as string | null) ?? null,
    course: String(r.course ?? ''),
    stageLabel: String(r.stage_label ?? '등록'),
    stageKind: (r.stage_kind as Nurture['stageKind']) ?? 'enrolled',
    nextMeetOn: (r.next_meet_on as string | null) ?? null,
    nextMeetNote: (r.next_meet_note as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    celebrate: (r.celebrate as string | null) ?? null,
  }));
}

/** 목장 전체에 보이는 것은 이 집계뿐이다 — 이름은 나오지 않는다. */
export async function getNurtureSummary(cellId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('cell_nurture_summary', { target_cell_id: cellId });
  if (error) return {};
  const out: Record<string, number> = {};
  for (const r of ((data ?? []) as Record<string, unknown>[])) {
    out[String(r.stage_kind)] = Number(r.cnt ?? 0);
  }
  return out;
}

export async function createNurture(input: {
  cellId: string;
  learnerId: string;
  mentorId?: string | null;
  course: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_nurtures').insert({
    cell_id: input.cellId,
    learner_id: input.learnerId,
    mentor_id: input.mentorId ?? null,
    course: input.course,
  });
  return { error: error?.message ?? null };
}

export async function updateNurture(
  id: string,
  patch: Partial<{
    mentorId: string | null;
    stageKind: Nurture['stageKind'];
    stageLabel: string;
    nextMeetOn: string | null;
    nextMeetNote: string | null;
    note: string | null;
    celebrate: string | null;
  }>,
): Promise<{ error: string | null }> {
  const row: Record<string, unknown> = {};
  if (patch.mentorId !== undefined) row.mentor_id = patch.mentorId;
  if (patch.stageKind !== undefined) row.stage_kind = patch.stageKind;
  if (patch.stageLabel !== undefined) row.stage_label = patch.stageLabel;
  if (patch.nextMeetOn !== undefined) row.next_meet_on = patch.nextMeetOn;
  if (patch.nextMeetNote !== undefined) row.next_meet_note = patch.nextMeetNote;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.celebrate !== undefined) row.celebrate = patch.celebrate;
  const { error } = await supabase.from('cell_nurtures').update(row).eq('id', id);
  return { error: error?.message ?? null };
}

// ════════════════════════════════════════════════════════════════════
// 돌봄실
// ════════════════════════════════════════════════════════════════════

export type CareNote = {
  id: string;
  cellId: string;
  aboutMemberId: string | null;
  aboutName: string | null;
  authorId: string;
  kind: 'call' | 'visit' | 'need' | 'thanks';
  body: string;
  followUpOn: string | null;
  done: boolean;
  createdAt: string;
};

export const CARE_KINDS: { kind: CareNote['kind']; label: string }[] = [
  { kind: 'call', label: '연락' },
  { kind: 'visit', label: '방문' },
  { kind: 'need', label: '필요' },
  { kind: 'thanks', label: '감사' },
];

export async function getCareNotes(cellId: string): Promise<CareNote[]> {
  const { data, error } = await supabase
    .from('cell_care_notes')
    .select('id, cell_id, about_member_id, about_name, author_id, kind, body, follow_up_on, done, created_at')
    .eq('cell_id', cellId)
    .is('deleted_at', null)
    .order('done')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    cellId: String(r.cell_id),
    aboutMemberId: (r.about_member_id as string | null) ?? null,
    aboutName: (r.about_name as string | null) ?? null,
    authorId: String(r.author_id),
    kind: (r.kind as CareNote['kind']) ?? 'call',
    body: String(r.body ?? ''),
    followUpOn: (r.follow_up_on as string | null) ?? null,
    done: Boolean(r.done),
    createdAt: String(r.created_at),
  }));
}

export async function createCareNote(input: {
  cellId: string;
  authorId: string;
  kind: CareNote['kind'];
  body: string;
  aboutMemberId?: string | null;
  aboutName?: string | null;
  followUpOn?: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_care_notes').insert({
    cell_id: input.cellId,
    author_id: input.authorId,
    kind: input.kind,
    body: input.body,
    about_member_id: input.aboutMemberId ?? null,
    about_name: input.aboutName ?? null,
    follow_up_on: input.followUpOn ?? null,
  });
  return { error: error?.message ?? null };
}

export async function setCareDone(id: string, done: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_care_notes').update({ done }).eq('id', id);
  return { error: error?.message ?? null };
}

/** 목장 교인 명단(교적). 돌봄 대상을 고를 때 쓴다. */
export async function getCellMembers(cellId: string): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('members')
    .select('id, name')
    .eq('cell_id', cellId)
    .is('deleted_at', null)
    .order('name');
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
  }));
}

// ════════════════════════════════════════════════════════════════════
// 사역실
// ════════════════════════════════════════════════════════════════════

export type MinistryRole = {
  id: string;
  ministryId: string;
  name: string;
  takenBy: string | null;
};

export type Ministry = {
  id: string;
  cellId: string;
  title: string;
  purpose: string | null;
  serveOn: string | null;
  place: string | null;
  supplies: string | null;
  status: 'planned' | 'doing' | 'done' | 'cancelled';
  result: string | null;
  nextStep: string | null;
  createdBy: string;
  roles: MinistryRole[];
};

export async function getMinistries(cellId: string): Promise<Ministry[]> {
  const { data, error } = await supabase
    .from('cell_ministries')
    .select('id, cell_id, title, purpose, serve_on, place, supplies, status, result, next_step, created_by')
    .eq('cell_id', cellId)
    .is('deleted_at', null)
    .order('serve_on', { ascending: false, nullsFirst: false })
    .limit(40);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const roles = rows.length > 0 ? await getMinistryRoles(rows.map((r) => String(r.id))) : new Map();
  return rows.map((r) => ({
    id: String(r.id),
    cellId: String(r.cell_id),
    title: String(r.title ?? ''),
    purpose: (r.purpose as string | null) ?? null,
    serveOn: (r.serve_on as string | null) ?? null,
    place: (r.place as string | null) ?? null,
    supplies: (r.supplies as string | null) ?? null,
    status: (r.status as Ministry['status']) ?? 'planned',
    result: (r.result as string | null) ?? null,
    nextStep: (r.next_step as string | null) ?? null,
    createdBy: String(r.created_by),
    roles: roles.get(String(r.id)) ?? [],
  }));
}

async function getMinistryRoles(ids: string[]): Promise<Map<string, MinistryRole[]>> {
  const map = new Map<string, MinistryRole[]>();
  const { data } = await supabase
    .from('cell_ministry_roles')
    .select('id, ministry_id, name, taken_by')
    .in('ministry_id', ids)
    .order('created_at');
  for (const r of ((data ?? []) as Record<string, unknown>[])) {
    const key = String(r.ministry_id);
    const list = map.get(key) ?? [];
    list.push({
      id: String(r.id),
      ministryId: key,
      name: String(r.name ?? ''),
      takenBy: (r.taken_by as string | null) ?? null,
    });
    map.set(key, list);
  }
  return map;
}

export async function createMinistry(input: {
  cellId: string;
  createdBy: string;
  title: string;
  purpose?: string;
  serveOn?: string | null;
  place?: string;
  supplies?: string;
  /** 쉼표로 나눠 적은 역할. 빈 것은 버린다. */
  roleNames?: string[];
}): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('cell_ministries')
    .insert({
      cell_id: input.cellId,
      created_by: input.createdBy,
      title: input.title,
      purpose: input.purpose || null,
      serve_on: input.serveOn || null,
      place: input.place || null,
      supplies: input.supplies || null,
    })
    .select('id')
    .maybeSingle();
  if (error) return { error: error.message };
  const id = data ? String((data as { id: string }).id) : null;
  const names = (input.roleNames ?? []).map((n) => n.trim()).filter(Boolean);
  if (id && names.length > 0) {
    await supabase.from('cell_ministry_roles').insert(names.map((name) => ({ ministry_id: id, name })));
  }
  return { error: null };
}

export async function updateMinistry(
  id: string,
  patch: Partial<{ status: Ministry['status']; result: string | null; nextStep: string | null }>,
): Promise<{ error: string | null }> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.result !== undefined) row.result = patch.result;
  if (patch.nextStep !== undefined) row.next_step = patch.nextStep;
  const { error } = await supabase.from('cell_ministries').update(row).eq('id', id);
  return { error: error?.message ?? null };
}

/**
 * 역할 맡기·내려놓기.
 *
 * 정책이 「비어 있거나 내 것」만 열어 두어, 남이 맡은 역할은 여기서 눌러도
 * 조용히 0줄이 바뀐다. 그래서 바뀐 줄 수를 보고 알려 준다.
 */
export async function takeRole(roleId: string, userId: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cell_ministry_roles')
    .update({ taken_by: userId, taken_at: userId ? new Date().toISOString() : null })
    .eq('id', roleId);
  return { error: error?.message ?? null };
}

// ════════════════════════════════════════════════════════════════════
// 선교실
// ════════════════════════════════════════════════════════════════════

export type MissionMedia = {
  id: string;
  missionId: string;
  kind: 'image' | 'video';
  /** village-media 통 안의 경로. 전체 주소는 담지 않는다. */
  path: string;
  url: string;
  caption: string | null;
  createdBy: string;
};

/**
 * AI 에게 그림·영상을 부탁할 때 들려 보내는 칸들.
 *
 * 따로 뽑아 둔 까닭: 아직 만들지 않은 카드(입력 중인 것)로도 부탁할 수 있어야
 * 한다. Mission 전체를 받게 하면 id 가 없는 동안은 부를 수가 없다.
 */
export type MissionSeedFields = {
  field: string;
  partner: string | null;
  story: string | null;
  prayerPoints: string | null;
};

export type Mission = MissionSeedFields & {
  id: string;
  cellId: string;
  supportNote: string | null;
  visitPlan: string | null;
  createdBy: string;
  createdAt: string;
  media: MissionMedia[];
};

export async function getMissions(cellId: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('cell_missions')
    .select('id, cell_id, field, partner, story, prayer_points, support_note, visit_plan, created_by, created_at')
    .eq('cell_id', cellId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const media = rows.length > 0 ? await getMissionMedia(rows.map((r) => String(r.id))) : new Map();
  return rows.map((r) => ({
    id: String(r.id),
    cellId: String(r.cell_id),
    field: String(r.field ?? ''),
    partner: (r.partner as string | null) ?? null,
    story: (r.story as string | null) ?? null,
    prayerPoints: (r.prayer_points as string | null) ?? null,
    supportNote: (r.support_note as string | null) ?? null,
    visitPlan: (r.visit_plan as string | null) ?? null,
    createdBy: String(r.created_by),
    createdAt: String(r.created_at),
    media: media.get(String(r.id)) ?? [],
  }));
}

export async function createMission(input: {
  cellId: string;
  createdBy: string;
  field: string;
  partner?: string;
  story?: string;
  prayerPoints?: string;
  supportNote?: string;
  visitPlan?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_missions').insert({
    cell_id: input.cellId,
    created_by: input.createdBy,
    field: input.field,
    partner: input.partner || null,
    story: input.story || null,
    prayer_points: input.prayerPoints || null,
    support_note: input.supportNote || null,
    visit_plan: input.visitPlan || null,
  });
  return { error: error?.message ?? null };
}

// ════════════════════════════════════════════════════════════════════
// 마을 광장
// ════════════════════════════════════════════════════════════════════

export type VillagePost = {
  id: string;
  cellId: string;
  authorId: string;
  kind: 'news' | 'testimony' | 'invite' | 'thanks' | 'ministry' | 'mission';
  title: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  cheers: number;
  iCheered: boolean;
};

export const POST_KINDS: { kind: VillagePost['kind']; label: string }[] = [
  { kind: 'news', label: '소식' },
  { kind: 'testimony', label: '간증' },
  { kind: 'invite', label: '초대' },
  { kind: 'thanks', label: '감사' },
  { kind: 'ministry', label: '사역' },
  { kind: 'mission', label: '선교' },
];

export async function getVillagePosts(villageId: string | null, myId: string): Promise<VillagePost[]> {
  let q = supabase
    .from('village_posts')
    .select('id, cell_id, author_id, kind, title, body, status, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);
  q = villageId ? q.eq('village_id', villageId) : q.is('village_id', null);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const cheers = await getCheers('post', rows.map((r) => String(r.id)), myId);
  return rows.map((r) => {
    const id = String(r.id);
    return {
      id,
      cellId: String(r.cell_id),
      authorId: String(r.author_id),
      kind: (r.kind as VillagePost['kind']) ?? 'news',
      title: String(r.title ?? ''),
      body: String(r.body ?? ''),
      status: (r.status as VillagePost['status']) ?? 'pending',
      createdAt: String(r.created_at),
      cheers: cheers.get(id)?.count ?? 0,
      iCheered: cheers.get(id)?.mine ?? false,
    };
  });
}

/** 마을 공유 제안. 언제나 대기 상태로 선다(정책이 status='pending' 만 받는다). */
export async function proposeVillagePost(input: {
  churchId: string;
  villageId: string | null;
  cellId: string;
  authorId: string;
  kind: VillagePost['kind'];
  title: string;
  body: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('village_posts').insert({
    church_id: input.churchId,
    village_id: input.villageId,
    cell_id: input.cellId,
    author_id: input.authorId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    status: 'pending',
  });
  return { error: error?.message ?? null };
}

export async function decideVillagePost(
  id: string,
  approve: boolean,
  approverId: string,
  reason?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('village_posts')
    .update({
      status: approve ? 'approved' : 'rejected',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      reject_reason: approve ? null : (reason || null),
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

// ── 마을회관 ────────────────────────────────────────────────────────

export type VillageEvent = {
  id: string;
  title: string;
  body: string | null;
  eventOn: string;
  startTime: string | null;
  place: string | null;
  signups: number;
  iSignedUp: boolean;
};

export async function getVillageEvents(villageId: string | null, myId: string): Promise<VillageEvent[]> {
  let q = supabase
    .from('village_events')
    .select('id, title, body, event_on, start_time, place')
    .is('deleted_at', null)
    .order('event_on')
    .limit(40);
  q = villageId ? q.eq('village_id', villageId) : q.is('village_id', null);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const signs = await getSignups('event', rows.map((r) => String(r.id)), myId);
  return rows.map((r) => {
    const id = String(r.id);
    return {
      id,
      title: String(r.title ?? ''),
      body: (r.body as string | null) ?? null,
      eventOn: String(r.event_on),
      startTime: (r.start_time as string | null) ?? null,
      place: (r.place as string | null) ?? null,
      signups: signs.get(id)?.count ?? 0,
      iSignedUp: signs.get(id)?.mine ?? false,
    };
  });
}

export async function createVillageEvent(input: {
  churchId: string;
  villageId: string | null;
  createdBy: string;
  title: string;
  body?: string;
  eventOn: string;
  startTime?: string;
  place?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('village_events').insert({
    church_id: input.churchId,
    village_id: input.villageId,
    created_by: input.createdBy,
    title: input.title,
    body: input.body || null,
    event_on: input.eventOn,
    start_time: input.startTime || null,
    place: input.place || null,
  });
  return { error: error?.message ?? null };
}

// ── 함께하는 사역 ──────────────────────────────────────────────────

export type VillageWork = {
  id: string;
  title: string;
  body: string | null;
  workOn: string | null;
  place: string | null;
  status: 'planned' | 'doing' | 'done' | 'cancelled';
  signups: number;
  iSignedUp: boolean;
};

export async function getVillageWorks(villageId: string | null, myId: string): Promise<VillageWork[]> {
  let q = supabase
    .from('village_works')
    .select('id, title, body, work_on, place, status')
    .is('deleted_at', null)
    .order('work_on', { ascending: false, nullsFirst: false })
    .limit(40);
  q = villageId ? q.eq('village_id', villageId) : q.is('village_id', null);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const signs = await getSignups('work', rows.map((r) => String(r.id)), myId);
  return rows.map((r) => {
    const id = String(r.id);
    return {
      id,
      title: String(r.title ?? ''),
      body: (r.body as string | null) ?? null,
      workOn: (r.work_on as string | null) ?? null,
      place: (r.place as string | null) ?? null,
      status: (r.status as VillageWork['status']) ?? 'planned',
      signups: signs.get(id)?.count ?? 0,
      iSignedUp: signs.get(id)?.mine ?? false,
    };
  });
}

export async function createVillageWork(input: {
  churchId: string;
  villageId: string | null;
  createdBy: string;
  title: string;
  body?: string;
  workOn?: string | null;
  place?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('village_works').insert({
    church_id: input.churchId,
    village_id: input.villageId,
    created_by: input.createdBy,
    title: input.title,
    body: input.body || null,
    work_on: input.workOn || null,
    place: input.place || null,
  });
  return { error: error?.message ?? null };
}

// ── 기도정원 ────────────────────────────────────────────────────────

export type VillagePrayer = {
  id: string;
  cellId: string;
  authorId: string;
  title: string;
  body: string | null;
  isAnonymous: boolean;
  answered: boolean;
  answeredNote: string | null;
  createdAt: string;
  amens: number;
  iAmened: boolean;
};

export async function getVillagePrayers(villageId: string | null, myId: string): Promise<VillagePrayer[]> {
  let q = supabase
    .from('village_prayers')
    .select('id, cell_id, author_id, title, body, is_anonymous, answered, answered_note, created_at')
    .is('deleted_at', null)
    .order('answered')
    .order('created_at', { ascending: false })
    .limit(60);
  q = villageId ? q.eq('village_id', villageId) : q.is('village_id', null);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const cheers = await getCheers('prayer', rows.map((r) => String(r.id)), myId);
  return rows.map((r) => {
    const id = String(r.id);
    return {
      id,
      cellId: String(r.cell_id),
      authorId: String(r.author_id),
      title: String(r.title ?? ''),
      body: (r.body as string | null) ?? null,
      isAnonymous: Boolean(r.is_anonymous),
      answered: Boolean(r.answered),
      answeredNote: (r.answered_note as string | null) ?? null,
      createdAt: String(r.created_at),
      amens: cheers.get(id)?.count ?? 0,
      iAmened: cheers.get(id)?.mine ?? false,
    };
  });
}

export async function postVillagePrayer(input: {
  churchId: string;
  villageId: string | null;
  cellId: string;
  authorId: string;
  title: string;
  body?: string;
  isAnonymous?: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('village_prayers').insert({
    church_id: input.churchId,
    village_id: input.villageId,
    cell_id: input.cellId,
    author_id: input.authorId,
    title: input.title,
    body: input.body || null,
    is_anonymous: input.isAnonymous ?? false,
  });
  return { error: error?.message ?? null };
}

/** 응답 표시. **응답 시각은 표의 트리거가 채운다** — 기기 시계를 믿지 않는다. */
export async function markPrayerAnswered(
  id: string,
  answered: boolean,
  note?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('village_prayers')
    .update({ answered, answered_note: answered ? (note || null) : null })
    .eq('id', id);
  return { error: error?.message ?? null };
}

// ── 반응·신청 (광장·기도·봉사가 함께 쓴다) ─────────────────────────

type Tally = Map<string, { count: number; mine: boolean }>;

async function getCheers(
  kind: 'post' | 'prayer' | 'work',
  ids: string[],
  myId: string,
): Promise<Tally> {
  const map: Tally = new Map();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from('village_cheers')
    .select('target_id, user_id')
    .eq('target_kind', kind)
    .in('target_id', ids);
  for (const r of ((data ?? []) as Record<string, unknown>[])) {
    const id = String(r.target_id);
    const cur = map.get(id) ?? { count: 0, mine: false };
    cur.count += 1;
    if (String(r.user_id) === myId) cur.mine = true;
    map.set(id, cur);
  }
  return map;
}

/** 다시 누르면 취소된다. 한 사람이 한 번 — 기본키가 그것을 지킨다. */
export async function toggleCheer(
  kind: 'post' | 'prayer' | 'work',
  targetId: string,
  userId: string,
  on: boolean,
  emoji = '🙏',
): Promise<{ error: string | null }> {
  if (on) {
    const { error } = await supabase
      .from('village_cheers')
      .insert({ target_kind: kind, target_id: targetId, user_id: userId, emoji });
    return { error: error?.message ?? null };
  }
  const { error } = await supabase
    .from('village_cheers')
    .delete()
    .eq('target_kind', kind)
    .eq('target_id', targetId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

async function getSignups(kind: 'event' | 'work', ids: string[], myId: string): Promise<Tally> {
  const map: Tally = new Map();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from('village_signups')
    .select('target_id, user_id')
    .eq('target_kind', kind)
    .in('target_id', ids);
  for (const r of ((data ?? []) as Record<string, unknown>[])) {
    const id = String(r.target_id);
    const cur = map.get(id) ?? { count: 0, mine: false };
    cur.count += 1;
    if (String(r.user_id) === myId) cur.mine = true;
    map.set(id, cur);
  }
  return map;
}

export async function toggleSignup(
  kind: 'event' | 'work',
  targetId: string,
  userId: string,
  on: boolean,
  role?: string,
): Promise<{ error: string | null }> {
  if (on) {
    const { error } = await supabase
      .from('village_signups')
      .insert({ target_kind: kind, target_id: targetId, user_id: userId, role: role ?? null });
    return { error: error?.message ?? null };
  }
  const { error } = await supabase
    .from('village_signups')
    .delete()
    .eq('target_kind', kind)
    .eq('target_id', targetId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

// ════════════════════════════════════════════════════════════════════
// 선교 카드의 사진·영상
// ════════════════════════════════════════════════════════════════════
//
// 경로만 담고 전체 주소는 담지 않는다 — 통을 옮기면 담아 둔 주소가 전부 죽는다.
// (감사일기 사진이 같은 방식이다.)

const MEDIA_BUCKET = 'village-media';

/** 25MB. 표(0086)에도 같은 한도가 걸려 있다 — 여기서 먼저 막아 헛수고를 줄인다. */
export const MISSION_VIDEO_MAX_BYTES = 26214400;

export function villageMediaUrl(path: string): string {
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function getMissionMedia(missionIds: string[]): Promise<Map<string, MissionMedia[]>> {
  const map = new Map<string, MissionMedia[]>();
  const { data } = await supabase
    .from('cell_mission_media')
    .select('id, mission_id, kind, path, caption, created_by')
    .in('mission_id', missionIds)
    .order('sort_order')
    .order('created_at');
  for (const r of ((data ?? []) as Record<string, unknown>[])) {
    const key = String(r.mission_id);
    const list = map.get(key) ?? [];
    const path = String(r.path);
    list.push({
      id: String(r.id),
      missionId: key,
      kind: r.kind === 'video' ? 'video' : 'image',
      path,
      url: villageMediaUrl(path),
      caption: (r.caption as string | null) ?? null,
      createdBy: String(r.created_by),
    });
    map.set(key, list);
  }
  return map;
}

/**
 * 사진·영상 올리기.
 *
 * **사진만 줄인다.** 휴대폰 사진 한 장이 그대로 2MB 를 넘는 일이 흔하고, 선교
 * 카드는 여러 장이 한 화면에 깔리는 곳이라 그대로 두면 전송량이 금세 찬다
 * (2026-08-29 에 전송량 한도로 프로젝트 둘이 멎은 적이 있다). 가로 1600px ·
 * JPEG 0.8 이면 대개 300KB 안쪽인데 눈으로는 차이가 없다.
 *
 * 영상은 손대지 않는다. 여기서 다시 인코딩할 방법이 없고, 25MB 넘는 것은
 * 애초에 받지 않는다 — 긴 영상은 유튜브에 올리고 소식에 주소를 적는 편이 맞다.
 */
export async function addMissionMedia(input: {
  missionId: string;
  userId: string;
  uri: string;
  kind: 'image' | 'video';
  mimeType?: string;
  fileSize?: number;
  caption?: string;
}): Promise<{ error: string | null }> {
  try {
    if (input.kind === 'video' && (input.fileSize ?? 0) > MISSION_VIDEO_MAX_BYTES) {
      return { error: '영상은 25MB까지 올릴 수 있어요. 긴 영상은 유튜브에 올리고 소식에 주소를 적어 주세요.' };
    }

    let source = input.uri;
    let type = input.mimeType ?? (input.kind === 'video' ? 'video/mp4' : 'image/jpeg');
    if (input.kind === 'image') {
      const shrunk = await ImageManipulator.manipulateAsync(input.uri, [{ resize: { width: 1600 } }], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }).catch(() => null);
      // 줄이기가 실패하면 원본 그대로 올린다 — 못 올리는 것보다 낫다.
      if (shrunk) {
        source = shrunk.uri;
        type = 'image/jpeg';
      }
    }

    const response = await fetch(source);
    const arrayBuffer = await response.arrayBuffer();
    if (input.kind === 'video' && arrayBuffer.byteLength > MISSION_VIDEO_MAX_BYTES) {
      return { error: '영상은 25MB까지 올릴 수 있어요. 긴 영상은 유튜브에 올리고 소식에 주소를 적어 주세요.' };
    }

    const ext = (type.split('/')[1] ?? 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `missions/${input.missionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, arrayBuffer, {
      contentType: type,
      cacheControl: STORAGE_CACHE_SECONDS,
    });
    if (upErr) return { error: upErr.message };

    const { error } = await supabase.from('cell_mission_media').insert({
      mission_id: input.missionId,
      kind: input.kind,
      path,
      caption: input.caption || null,
      created_by: input.userId,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '올리지 못했어요.' };
  }
}

/**
 * 떼어내기.
 *
 * 표에서 줄을 지우고, 통의 파일도 지워 본다. 파일 지우기가 막혀도(올린 사람이
 * 아니면 저장소 정책이 막는다) **줄은 이미 지워졌으므로 화면에서는 사라진다.**
 * 걸리지 않은 파일은 아무 화면에도 안 나온다.
 */
export async function removeMissionMedia(id: string, path: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_mission_media').delete().eq('id', id);
  if (error) return { error: error.message };
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  return { error: null };
}
