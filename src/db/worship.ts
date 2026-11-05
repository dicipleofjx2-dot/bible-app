import { currentChurchId } from '@/lib/churchScope';
import { supabase } from '@/lib/supabase';

/**
 * 예배 — 예배 칸(매주 링크)과 예배별 보고서.
 *
 * 표는 셋이고 수명이 다르다(`supabase/migrations/0098_worship.sql`).
 *   · `worship_meetings`       — 계속 있는 예배 칸
 *   · `worship_reports`        — 그 날 그 예배의 보고서(성도도 읽는다)
 *   · `worship_report_private` — 같은 보고서의 대표관리자 전용 부분
 *
 * **권한은 DB 에게 묻는다**(`can_write_worship`, `can_read_worship_private`).
 * 화면에서 따로 세면 단추는 보이는데 저장이 막히거나, 더 나쁘게는 가려야 할
 * 것을 화면만 가리고 자료는 열린 채로 둔다.
 */

export type Congregation = 'adult' | 'next' | 'youth';

/** 교회가 예배를 묶어 부르는 세 덩이. 화면 순서도 이 차례다. */
export const CONGREGATIONS: { value: Congregation; label: string; emoji: string }[] = [
  { value: 'adult', label: '장년', emoji: '⛪' },
  { value: 'next', label: '다음세대', emoji: '🌱' },
  { value: 'youth', label: '청년', emoji: '🔥' },
];

export function congregationLabel(value: Congregation): string {
  return CONGREGATIONS.find((c) => c.value === value)?.label ?? value;
}

export type WorshipMeeting = {
  id: string;
  congregation: Congregation;
  name: string;
  /** 「주일 오전 11:00」처럼 사람이 읽는 대로. 비어 있을 수 있다. */
  meetsAt: string;
  /** 늘 같은 링크 — 생중계·재생목록·채널. 그 주 영상은 보고서에 있다. */
  linkUrl: string;
  linkLabel: string;
  sortOrder: number;
  isActive: boolean;
};

export type WorshipReport = {
  id: string;
  meetingId: string;
  /** YYYY-MM-DD */
  heldOn: string;
  videoUrl: string;
  preacher: string;
  sermonTitle: string;
  passage: string;
  attendance: number | null;
  /** 공개 본문. 같은 교회 성도가 읽는다. */
  body: string;
  authorId: string;
  updatedAt: string;
};

/** 대표관리자(와 적은 사람)만 읽는 부분. */
export type WorshipReportPrivate = {
  body: string;
  offeringNote: string;
};

function mapMeeting(row: any): WorshipMeeting {
  return {
    id: row.id,
    congregation: row.congregation,
    name: row.name ?? '',
    meetsAt: row.meets_at ?? '',
    linkUrl: row.link_url ?? '',
    linkLabel: row.link_label ?? '',
    sortOrder: row.sort_order ?? 0,
    isActive: !!row.is_active,
  };
}

function mapReport(row: any): WorshipReport {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    heldOn: row.held_on,
    videoUrl: row.video_url ?? '',
    preacher: row.preacher ?? '',
    sermonTitle: row.sermon_title ?? '',
    passage: row.passage ?? '',
    attendance: row.attendance ?? null,
    body: row.body ?? '',
    authorId: row.author_id,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

// ── 예배 칸 ──────────────────────────────────────────────────────────────

/**
 * 예배 목록.
 *
 * `includeHidden` 은 관리 화면만 쓴다. 꺼 둔 예배를 되살리려면 보여야 하기
 * 때문이다. 성도 화면은 **조건을 스스로 적는다** — 관리자에게 걸린 정책이
 * `for all` 이라 읽기에도 걸리고, 정책 여럿은 OR 로 묶여서 DB 만 믿으면
 * 관리자 화면에만 꺼 둔 예배가 섞여 나온다(2026-11 알림팝업과 같은 함정).
 */
export async function getMeetings(includeHidden = false): Promise<WorshipMeeting[]> {
  let query = supabase
    .from('worship_meetings')
    .select('*')
    .is('deleted_at', null)
    .order('congregation', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (!includeHidden) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapMeeting);
}

export async function getMeeting(id: string): Promise<WorshipMeeting | null> {
  const { data, error } = await supabase
    .from('worship_meetings')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data ? mapMeeting(data) : null;
}

export type MeetingInput = {
  congregation: Congregation;
  name: string;
  meetsAt: string;
  linkUrl: string;
  linkLabel: string;
  sortOrder: number;
  isActive: boolean;
};

export async function saveMeeting(
  id: string | null,
  input: MeetingInput,
): Promise<{ error?: string }> {
  const name = input.name.trim();
  if (!name) return { error: '예배 이름을 적어 주세요.' };

  const patch = {
    congregation: input.congregation,
    name,
    meets_at: input.meetsAt.trim() || null,
    link_url: input.linkUrl.trim() || null,
    link_label: input.linkLabel.trim() || null,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  };

  const { error } = id
    ? await supabase.from('worship_meetings').update(patch).eq('id', id)
    : await supabase.from('worship_meetings').insert(patch);
  return { error: error?.message };
}

/**
 * 예배 칸을 내린다. 줄은 남는다.
 *
 * 통째로 지우면 딸린 보고서가 함께 사라진다(on delete cascade). 몇 해분 보고가
 * 단추 한 번에 날아가는 일은 만들지 않는다.
 */
export async function removeMeeting(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('worship_meetings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message };
}

// ── 보고서 ───────────────────────────────────────────────────────────────

export async function getReports(meetingId: string, limit = 30): Promise<WorshipReport[]> {
  const { data, error } = await supabase
    .from('worship_reports')
    .select('*')
    .eq('meeting_id', meetingId)
    .is('deleted_at', null)
    .order('held_on', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapReport);
}

/**
 * 예배마다 마지막 보고 날짜. 목록 화면에서 「언제까지 보고됐나」를 보여 준다.
 *
 * 예배 칸마다 따로 부르지 않는다 — 칸이 열 개면 열 번 오간다.
 */
export async function getLastReportDates(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('worship_reports')
    .select('meeting_id, held_on')
    .is('deleted_at', null)
    .order('held_on', { ascending: false });
  if (error) throw error;

  const last = new Map<string, string>();
  for (const row of (data ?? []) as { meeting_id: string; held_on: string }[]) {
    if (!last.has(row.meeting_id)) last.set(row.meeting_id, row.held_on);
  }
  return last;
}

/**
 * 보고서들의 비공개 부분. 볼 수 없는 것은 그냥 빠져 온다(오류가 아니다).
 *
 * RLS 가 걸러 주므로 화면은 「돌아온 것만」 그리면 된다.
 */
export async function getPrivateParts(
  reportIds: string[],
): Promise<Map<string, WorshipReportPrivate>> {
  if (reportIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('worship_report_private')
    .select('report_id, body, offering_note')
    .in('report_id', reportIds);
  if (error) throw error;

  const map = new Map<string, WorshipReportPrivate>();
  for (const row of (data ?? []) as any[]) {
    map.set(row.report_id, { body: row.body ?? '', offeringNote: row.offering_note ?? '' });
  }
  return map;
}

export type ReportInput = {
  meetingId: string;
  heldOn: string;
  videoUrl: string;
  preacher: string;
  sermonTitle: string;
  passage: string;
  /** 빈 칸이면 null 로 넣는다 — 0 과 「안 적었다」는 다르다. */
  attendance: string;
  body: string;
  privateBody: string;
  offeringNote: string;
  /**
   * 비공개 부분을 **읽은 채로** 고치는 중인가.
   *
   * 못 읽는 사람(남이 적은 비공개 부분)이 보고서를 고칠 때, 빈 칸을 그대로
   * 저장하면 보이지 않는 글을 지워 버린다. 그래서 읽지 못했으면 **적은 것이
   * 있을 때만** 비공개 부분을 건드린다.
   */
  privateLoaded: boolean;
};

export async function saveReport(
  id: string | null,
  input: ReportInput,
): Promise<{ error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.heldOn)) return { error: '예배 날짜를 골라 주세요.' };

  const attendance = input.attendance.trim() ? Number(input.attendance.trim()) : null;
  if (attendance !== null && (!Number.isFinite(attendance) || attendance < 0)) {
    return { error: '참석 인원은 0 이상의 숫자로 적어 주세요.' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { error: '로그인이 필요합니다.' };

  const patch = {
    meeting_id: input.meetingId,
    held_on: input.heldOn,
    video_url: input.videoUrl.trim() || null,
    preacher: input.preacher.trim() || null,
    sermon_title: input.sermonTitle.trim() || null,
    passage: input.passage.trim() || null,
    attendance,
    body: input.body.trim(),
    author_id: userId,
  };

  const { data, error } = id
    ? await supabase.from('worship_reports').update(patch).eq('id', id).select('id').maybeSingle()
    : await supabase.from('worship_reports').insert(patch).select('id').maybeSingle();

  if (error) {
    // 한 예배의 한 날에 보고서는 하나다(부분 유일 인덱스). 그 걸림만은 사람이
    // 알아볼 말로 바꿔 준다 — 「duplicate key value violates…」로는 무엇을
    // 해야 할지 알 수 없다.
    if (error.code === '23505' || /duplicate key/i.test(error.message)) {
      return { error: '그 날 보고서가 이미 있어요. 아래 목록에서 그것을 고쳐 주세요.' };
    }
    return { error: error.message };
  }

  const reportId = id ?? (data as { id?: string } | null)?.id;
  if (!reportId) return { error: '보고서를 저장했는데 번호를 받지 못했어요. 다시 열어 확인해 주세요.' };

  const typedSomething = !!(input.privateBody.trim() || input.offeringNote.trim());
  if (!input.privateLoaded && !typedSomething) return {};

  const { error: privateError } = await supabase.from('worship_report_private').upsert(
    {
      report_id: reportId,
      body: input.privateBody.trim(),
      offering_note: input.offeringNote.trim() || null,
      author_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'report_id' },
  );
  if (privateError) {
    return { error: `보고서는 저장됐지만 비공개 부분이 저장되지 않았어요 — ${privateError.message}` };
  }
  return {};
}

export async function removeReport(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('worship_reports')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message };
}

// ── 권한 ─────────────────────────────────────────────────────────────────

/** 보고서를 쓸 수 있는가 — 관리자 이상. */
export async function canWriteWorship(): Promise<boolean> {
  const churchId = await currentChurchId();
  const { data, error } = await supabase.rpc('can_write_worship', { target_church_id: churchId });
  if (error) {
    console.error('can_write_worship 실패', error.message);
    return false;
  }
  return !!data;
}

/** 비공개 부분을 볼 수 있는가 — 대표관리자만. */
export async function canReadWorshipPrivate(): Promise<boolean> {
  const churchId = await currentChurchId();
  const { data, error } = await supabase.rpc('can_read_worship_private', {
    target_church_id: churchId,
  });
  if (error) {
    console.error('can_read_worship_private 실패', error.message);
    return false;
  }
  return !!data;
}

/**
 * 새부대교회가 드리는 예배 한 벌(2026-11-05 사장님이 적어 주신 다섯).
 *
 * 관리 화면에서 **단추를 눌러야** 들어간다. 마이그레이션에서 넣지 않는 까닭:
 * 교회가 둘 이상이고, 틀린 줄이 저절로 들어와 있으면 지우는 일부터 해야 한다.
 *
 * 시각은 비워 두었다 — 몇 시에 드리는지 듣지 못했고, 틀린 시각이 적혀 있으면
 * 없는 것보다 나쁘다. 관리 화면에서 「고치기」로 채운다.
 */
export const DEFAULT_MEETINGS: Omit<MeetingInput, 'isActive'>[] = [
  { congregation: 'adult', name: '주일장년예배', meetsAt: '주일', linkUrl: '', linkLabel: '', sortOrder: 10 },
  { congregation: 'adult', name: '수요예배', meetsAt: '수요일', linkUrl: '', linkLabel: '', sortOrder: 20 },
  { congregation: 'adult', name: '금요예배', meetsAt: '금요일', linkUrl: '', linkLabel: '', sortOrder: 30 },
  { congregation: 'next', name: '주일다음세대예배', meetsAt: '주일', linkUrl: '', linkLabel: '', sortOrder: 10 },
  { congregation: 'youth', name: '주일청년예배', meetsAt: '주일', linkUrl: '', linkLabel: '', sortOrder: 10 },
];

/** 기본 예배를 한 번에 넣는다. 이미 있는 이름은 건너뛴다. */
export async function addDefaultMeetings(): Promise<{ added: number; error?: string }> {
  const existing = await getMeetings(true).catch(() => [] as WorshipMeeting[]);
  const have = new Set(existing.map((m) => `${m.congregation}:${m.name}`));
  const rows = DEFAULT_MEETINGS.filter((m) => !have.has(`${m.congregation}:${m.name}`)).map((m) => ({
    congregation: m.congregation,
    name: m.name,
    meets_at: m.meetsAt,
    sort_order: m.sortOrder,
    is_active: true,
  }));
  if (rows.length === 0) return { added: 0 };

  const { error } = await supabase.from('worship_meetings').insert(rows);
  if (error) return { added: 0, error: error.message };
  return { added: rows.length };
}
