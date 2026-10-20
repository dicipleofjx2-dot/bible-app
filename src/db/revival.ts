import { supabase } from '@/lib/supabase';

/**
 * 부흥의 천사들 — 네 사역과 기도 신청(0094).
 *
 * 사역은 넷이고 바뀌지 않는다. 그래서 목록은 코드에 두고, DB 에는 **언제 하는가**와
 * **누가 신청했는가**만 담는다.
 *
 * 신청 글은 민감하다 — 어디가 아픈지, 무엇에 눌려 있는지가 적힌다. 본인과 교회
 * 관리자만 읽을 수 있도록 DB 정책이 막고 있으므로(0094), 화면에서 또 거르지 않는다.
 * 같은 규칙을 두 군데 두면 한쪽만 고치게 된다.
 */

export const REVIVAL_KINDS = ['WORD', 'HEALING', 'WORSHIP', 'FINANCE'] as const;
export type RevivalKind = (typeof REVIVAL_KINDS)[number];

/**
 * 사역마다의 색.
 *
 * 포스터의 네 동그라미에서 가져왔다 — 말씀은 파랑, 치유는 금빛, 찬양은 붉은빛,
 * 재정은 초록. 종이로 받은 그 그림과 앱이 같은 색을 쓰면, 주보에서 보고 온 분이
 * 화면에서 같은 사역을 한눈에 찾는다.
 */
export const REVIVAL_MINISTRIES: {
  kind: RevivalKind;
  emoji: string;
  name: string;
  summary: string;
  /** 포스터의 동그라미 색 */
  color: string;
  /** 신청 칸에 무엇을 적으면 되는지. 사역마다 묻는 것이 다르다. */
  askLabel: string;
  askPlaceholder: string;
}[] = [
  {
    kind: 'WORD',
    color: '#2E6BB8',
    emoji: '📖',
    name: '말씀과 예언',
    summary: '말씀으로 묻고, 주시는 말씀을 받습니다',
    askLabel: '무엇을 여쭙고 싶으신가요',
    askPlaceholder: '지금 앞에 놓인 일, 묻고 싶은 것을 적어 주세요',
  },
  {
    kind: 'HEALING',
    color: '#E0A526',
    emoji: '🙌',
    name: '치유와 축사',
    summary: '몸과 마음의 아픔, 눌린 것에서 놓이도록 기도합니다',
    askLabel: '어디가 어떻게 아프신가요',
    askPlaceholder: '증상과 언제부터인지, 병원에서 들은 말이 있으면 함께 적어 주세요',
  },
  {
    kind: 'WORSHIP',
    color: '#C8102E',
    emoji: '🎵',
    name: '찬양과 경배',
    summary: '찬양 가운데 하나님을 만나는 자리입니다',
    askLabel: '어떤 마음으로 나오시나요',
    askPlaceholder: '드리고 싶은 찬양, 품고 나오는 마음을 적어 주세요',
  },
  {
    kind: 'FINANCE',
    color: '#157F3D',
    emoji: '🪙',
    name: '천국의 재정',
    summary: '재정의 막힌 것이 풀리고 하나님 나라의 길로 쓰이도록 기도합니다',
    askLabel: '무엇이 막혀 있나요',
    askPlaceholder: '빚·사업·직장처럼 지금 눌리는 것을 적어 주세요. 금액까지 적지 않으셔도 됩니다',
  },
];

/** "2026-11-09" → "11월 9일 (일)". 세 화면이 같은 모양으로 적도록 한곳에 둔다. */
export function formatMeetsOn(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

export function ministryOf(kind: RevivalKind) {
  return REVIVAL_MINISTRIES.find((m) => m.kind === kind) ?? REVIVAL_MINISTRIES[0];
}

export type RevivalSession = {
  id: string;
  kind: RevivalKind;
  meetsOn: string;
  place: string | null;
  note: string | null;
};

export type RevivalRequest = {
  id: string;
  kind: RevivalKind;
  sessionId: string | null;
  userId: string;
  name: string | null;
  body: string;
  afterNote: string | null;
  afterAt: string | null;
  createdAt: string;
};

function mapSession(row: Record<string, unknown>): RevivalSession {
  return {
    id: String(row.id),
    kind: row.kind as RevivalKind,
    meetsOn: String(row.meets_on),
    place: (row.place as string | null) ?? null,
    note: (row.note as string | null) ?? null,
  };
}

function mapRequest(row: Record<string, unknown>): RevivalRequest {
  return {
    id: String(row.id),
    kind: row.kind as RevivalKind,
    sessionId: (row.session_id as string | null) ?? null,
    userId: String(row.user_id),
    name: (row.name as string | null) ?? null,
    body: String(row.body ?? ''),
    afterNote: (row.after_note as string | null) ?? null,
    afterAt: (row.after_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

/**
 * 앞으로의 일정. 지난 것은 빼고 가까운 것부터.
 *
 * 오늘 것은 남긴다 — 「오늘 저녁에 한다」가 지난 일정으로 사라지면 안 된다.
 */
export async function getUpcomingSessions(): Promise<RevivalSession[]> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('revival_sessions')
    .select('id, kind, meets_on, place, note')
    .gte('meets_on', todayStr)
    .order('meets_on')
    .limit(40);
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/** 내가 낸 신청. 가장 최근 것부터. */
export async function getMyRequests(userId: string): Promise<RevivalRequest[]> {
  const { data, error } = await supabase
    .from('revival_requests')
    .select('id, kind, session_id, user_id, name, body, after_note, after_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRequest);
}

/** 기도 신청. church_id 는 DB 트리거가 채운다 — 화면이 보낸 값을 믿지 않는다. */
export async function createRequest(input: {
  kind: RevivalKind;
  sessionId: string | null;
  userId: string;
  name: string;
  body: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('revival_requests').insert({
    kind: input.kind,
    session_id: input.sessionId,
    user_id: input.userId,
    name: input.name.trim() || null,
    body: input.body.trim(),
  });
  return { error: error?.message ?? null };
}

/** 기도받은 뒤의 기록. 몇 번이고 고쳐 쓸 수 있다. */
export async function saveAfterNote(id: string, note: string): Promise<{ error: string | null }> {
  const trimmed = note.trim();
  const { error } = await supabase
    .from('revival_requests')
    .update({
      after_note: trimmed || null,
      after_at: trimmed ? new Date().toISOString() : null,
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

/** 잘못 올린 신청을 거둔다. 본인만 할 수 있다(정책이 막는다). */
export async function removeRequest(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('revival_requests').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/**
 * 관리자가 보는 전체 신청.
 *
 * 정책이 「본인 또는 같은 교회 관리자」로 막고 있으므로, 관리자가 아니면 자기 것만
 * 돌아온다 — 화면에서 따로 막지 않아도 샐 일이 없다.
 */
export async function getAllRequests(kind?: RevivalKind): Promise<RevivalRequest[]> {
  let query = supabase
    .from('revival_requests')
    .select('id, kind, session_id, user_id, name, body, after_note, after_at, created_at')
    .order('created_at', { ascending: false })
    .limit(300);
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapRequest);
}

/** 일정 넣기 — 관리자만(정책이 막는다). 같은 날 같은 사역은 하나다. */
export async function addSession(input: {
  kind: RevivalKind;
  meetsOn: string;
  place: string;
  note: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('revival_sessions').insert({
    kind: input.kind,
    meets_on: input.meetsOn,
    place: input.place.trim() || null,
    note: input.note.trim() || null,
  });
  if (error?.code === '23505') return { error: '그날 그 사역은 이미 적어 두셨습니다.' };
  if (error?.code === '23502') {
    // church_id 가 null — 교적(profiles.church_id)이 비어 있는 계정이다.
    return { error: '내 교회가 정해지지 않아 일정을 넣을 수 없습니다. 마이페이지에서 교회를 고르세요.' };
  }
  return { error: error?.message ?? null };
}

export async function removeSession(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('revival_sessions').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** 이 사람이 관리자인가. 신청자 전체 목록을 보여 줄지 가른다. */
export async function isAppAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  return !!(data as { is_admin?: boolean } | null)?.is_admin;
}
