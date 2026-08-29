import { supabase } from '@/lib/supabase';

/**
 * 목장방.
 *
 * 목장 자체는 이 앱이 아니라 **스마트주보의 교적**에 있다(org_units, members).
 * 여기서는 그것을 읽기만 하고, 방 안에서 오가는 것(공지·보고·심방신청)만
 * 새로 만든 표에 담는다 — 0065_cell_rooms.sql.
 *
 * 그래서 "누가 어느 목장 사람인가"를 이 앱이 따로 관리하지 않는다. 교적에서
 * 목장을 옮기면 다음에 앱을 열 때 바뀐 방이 뜬다.
 */

export type Cell = {
  id: string;
  name: string;
};

export type CellNotice = {
  id: string;
  cellId: string | null;
  title: string;
  body: string;
  isPinned: boolean;
  authorId: string;
  createdAt: string;
};

export type CellReport = {
  id: string;
  cellId: string;
  authorId: string;
  kind: 'report' | 'note';
  metOn: string;
  body: string;
  attendance: number | null;
  createdAt: string;
};

export type CellMeeting = {
  title: string;
  /** 0=일 … 6=토 */
  weekdays: number[];
  startTime: string;
  location: string | null;
};

export type CellContext = {
  /** 내 목장. 교적에 안 걸려 있으면 null. */
  cell: Cell | null;
  /** 관리자·교역자는 모든 목장을 고를 수 있다. */
  allCells: Cell[];
  isLeader: boolean;
  canSeeAll: boolean;
};

/**
 * 내가 어느 목장인지, 무엇을 할 수 있는지 한 번에 가져온다.
 *
 * 판정을 화면에서 하지 않고 DB 함수에 묻는 이유: 같은 규칙이 화면과 정책 두
 * 군데 있으면 반드시 어긋난다. 여기서는 물어보기만 한다.
 */
export async function getCellContext(): Promise<CellContext> {
  const [{ data: myCellId }, { data: canSeeAll }] = await Promise.all([
    supabase.rpc('my_cell_id'),
    supabase.rpc('can_see_all_cells'),
  ]);

  const seeAll = canSeeAll === true;
  const cellId = (myCellId as string | null) ?? null;

  // 관리자는 전부, 목원은 자기 목장 하나만 읽는다(RLS 가 아니라 org_units 는
  // 주보 정책을 따르므로 목록은 넉넉히 오고, 화면에서 고를 대상만 좁힌다).
  const { data: units } = await supabase
    .from('org_units')
    .select('id, name, unit_type, is_active')
    .eq('unit_type', 'cell')
    .eq('is_active', true)
    .order('sort_order');

  const all: Cell[] = ((units ?? []) as { id: string; name: string }[]).map((u) => ({
    id: String(u.id),
    name: String(u.name),
  }));

  const mine = cellId ? (all.find((c) => c.id === cellId) ?? null) : null;

  let isLeader = false;
  if (cellId) {
    const { data } = await supabase.rpc('is_cell_leader_of', { target_cell_id: cellId });
    isLeader = data === true;
  }

  return { cell: mine, allCells: seeAll ? all : mine ? [mine] : [], isLeader, canSeeAll: seeAll };
}

/**
 * 공지. 전체 공지(cell_id 가 null)와 그 목장 공지를 함께, 고정된 것부터.
 */
export async function getCellNotices(cellId: string): Promise<CellNotice[]> {
  const { data, error } = await supabase
    .from('cell_notices')
    .select('id, cell_id, title, body, is_pinned, author_id, created_at')
    .or(`cell_id.is.null,cell_id.eq.${cellId}`)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    cellId: (r.cell_id as string | null) ?? null,
    title: String(r.title ?? ''),
    body: String(r.body ?? ''),
    isPinned: Boolean(r.is_pinned),
    authorId: String(r.author_id),
    createdAt: String(r.created_at),
  }));
}

export async function createCellNotice(input: {
  cellId: string | null;
  title: string;
  body: string;
  authorId: string;
  isPinned?: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_notices').insert({
    cell_id: input.cellId,
    title: input.title,
    body: input.body,
    author_id: input.authorId,
    is_pinned: input.isPinned ?? false,
  });
  return { error: error?.message ?? null };
}

/** 지우기는 소프트 삭제다. 목장 기록은 남는 편이 낫다. */
export async function removeCellNotice(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cell_notices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

/** 보고와 상황. 올린 날이 아니라 **모인 날** 순으로 세운다. */
export async function getCellReports(cellId: string): Promise<CellReport[]> {
  const { data, error } = await supabase
    .from('cell_reports')
    .select('id, cell_id, author_id, kind, met_on, body, attendance, created_at')
    .eq('cell_id', cellId)
    .is('deleted_at', null)
    .order('met_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    cellId: String(r.cell_id),
    authorId: String(r.author_id),
    kind: r.kind === 'report' ? 'report' : 'note',
    metOn: String(r.met_on),
    body: String(r.body ?? ''),
    attendance: (r.attendance as number | null) ?? null,
    createdAt: String(r.created_at),
  }));
}

export async function createCellReport(input: {
  cellId: string;
  authorId: string;
  kind: 'report' | 'note';
  metOn: string;
  body: string;
  attendance?: number | null;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_reports').insert({
    cell_id: input.cellId,
    author_id: input.authorId,
    kind: input.kind,
    met_on: input.metOn,
    body: input.body,
    attendance: input.attendance ?? null,
  });
  return { error: error?.message ?? null };
}

export async function removeCellReport(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cell_reports')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

/**
 * 이번 주 모임 시간·장소.
 *
 * 목장방에 따로 적지 않는다 — 주보의 정기모임(gather_recurrences)에 등록된
 * 것을 읽는다. 거기 등록하면 주보의 "이번 주 예배와 모임"과 교회 캘린더에도
 * 함께 뜨기 때문이다. 여기에 또 적으면 한 사실이 두 군데가 되어 어긋난다.
 */
export async function getCellMeeting(cellId: string): Promise<CellMeeting | null> {
  const { data, error } = await supabase
    .from('gather_recurrences')
    .select('title, weekdays, start_time, location, org_unit_id, category')
    .eq('org_unit_id', cellId)
    .limit(1);
  if (error) return null;
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    title: String(row.title ?? '목장 모임'),
    weekdays: ((row.weekdays as number[] | null) ?? []).map(Number),
    startTime: String(row.start_time ?? ''),
    location: (row.location as string | null) ?? null,
  };
}

/**
 * 심방 신청. **목자만 부를 수 있다** — 화면에서 단추를 감추는 것과 별개로
 * DB 정책(cell_visit_requests_insert)이 목자인지 다시 본다.
 */
export async function requestVisit(input: {
  churchId: string;
  cellId: string;
  requesterId: string;
  reason: string;
  preferredWhen?: string;
  urgency?: 'normal' | 'soon' | 'urgent';
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cell_visit_requests').insert({
    church_id: input.churchId,
    cell_id: input.cellId,
    requester_id: input.requesterId,
    reason: input.reason,
    preferred_when: input.preferredWhen || null,
    urgency: input.urgency ?? 'normal',
  });
  return { error: error?.message ?? null };
}

export type VisitRequest = {
  id: string;
  reason: string;
  preferredWhen: string | null;
  urgency: string;
  status: string;
  createdAt: string;
  handlerNote: string | null;
};

/** 내가 낸 심방 신청. 목원에게는 보이지 않는다(정책이 막는다). */
export async function getMyVisitRequests(cellId: string): Promise<VisitRequest[]> {
  const { data, error } = await supabase
    .from('cell_visit_requests')
    .select('id, reason, preferred_when, urgency, status, created_at, handler_note')
    .eq('cell_id', cellId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    reason: String(r.reason ?? ''),
    preferredWhen: (r.preferred_when as string | null) ?? null,
    urgency: String(r.urgency ?? 'normal'),
    status: String(r.status ?? 'open'),
    createdAt: String(r.created_at),
    handlerNote: (r.handler_note as string | null) ?? null,
  }));
}
