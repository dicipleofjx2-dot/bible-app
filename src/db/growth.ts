import { supabase } from '@/lib/supabase';
import type {
  AttendanceStatus,
  GoalHorizon,
  GrowthArea,
  GrowthLevel,
  MemberRole,
  RecordVisibility,
} from '@/lib/growth';
import { makeInviteCode, normalizeInviteCode } from '@/lib/growth';

/**
 * 성장ON 데이터 (0084).
 *
 * 화면은 여기만 부른다. 권한은 전부 DB 정책이 잡는다 — 화면에서 거르면
 * 화면을 고칠 때마다 새는 자리가 생긴다(0081 기념관에서 한 판단과 같다).
 */

export type GrowthSchool = {
  id: string;
  name: string;
  motto: string;
  created_by: string;
};

export type GrowthMembership = {
  school_id: string;
  role: MemberRole;
  display_name: string;
  school: GrowthSchool | null;
};

export type GrowthStudent = {
  id: string;
  school_id: string;
  name: string;
  birth_date: string | null;
  grade: string;
  photo_path: string | null;
  interests: string;
  dream: string;
  gifts: string;
  learning_note: string;
  consent_photo_internal: boolean;
  consent_photo_public: boolean;
  consent_report_guardian: boolean;
  active: boolean;
};

export type GrowthRecordRow = {
  id: string;
  student_id: string;
  school_id: string;
  on_date: string;
  area: GrowthArea;
  level: GrowthLevel | null;
  subject: string;
  body: string;
  visibility: RecordVisibility;
  next_action: string;
  photo_path: string | null;
  created_at: string;
};

export type GrowthAttendanceRow = {
  id: string;
  student_id: string;
  on_date: string;
  status: AttendanceStatus;
  reason: string;
  note: string;
};

export type GrowthActivity = {
  id: string;
  school_id: string;
  title: string;
  on_date: string;
  place: string;
  leader: string;
  goal: string;
  subject_link: string;
  supplies: string;
  transport: string;
  emergency: string;
  safety: string;
  story: string;
  shared_with_guardians: boolean;
};

export type GrowthParticipant = {
  id: string;
  activity_id: string;
  student_id: string;
  role: string;
  observation: string;
  reflection: string;
  learned: string;
  thanks: string;
  next_step: string;
};

export type GrowthGoal = {
  id: string;
  student_id: string;
  horizon: GoalHorizon;
  body: string;
  method: string;
  period: string;
  status: 'active' | 'done' | 'paused';
};

export type GrowthMentoringNote = {
  id: string;
  student_id: string;
  on_date: string;
  kind: 'counsel' | 'health' | 'family' | 'other';
  body: string;
  follow_up: string;
};

export type GrowthReport = {
  id: string;
  student_id: string;
  period: string;
  body: string;
  teacher_letter: string;
  next_goals: string;
  home_suggestion: string;
  status: 'draft' | 'approved' | 'sent';
  approved_at: string | null;
};

export type GrowthNotice = {
  id: string;
  school_id: string;
  title: string;
  body: string;
  on_date: string | null;
  pinned: boolean;
  created_at: string;
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

// ───────────────────────── 학교·구성원 ─────────────────────────

/** 내가 속한 학교와 역할. 한 사람이 여러 역할을 겸할 수 있어 행이 여럿 온다. */
export async function myMemberships(): Promise<GrowthMembership[]> {
  const rows = unwrap(
    await supabase
      .from('growth_members')
      .select('school_id, role, display_name, growth_schools(id, name, motto, created_by)')
      .eq('active', true),
  ) as unknown as (Omit<GrowthMembership, 'school'> & { growth_schools: GrowthSchool | null })[];
  return rows.map((r) => ({
    school_id: r.school_id,
    role: r.role,
    display_name: r.display_name,
    school: r.growth_schools,
  }));
}

/**
 * 학교를 만들고 만든 사람을 owner 로 넣는다.
 *
 * 두 걸음이라 중간에 끊기면 「주인 없는 학교」가 남는다. 그때는 아무도 그
 * 학교를 읽지 못해(정책이 구성원만 연다) 조용히 사라진 것과 같다 — 남의
 * 기록이 새는 방향이 아니라서 rpc 로 묶지 않았다.
 */
export async function createSchool(name: string, userId: string): Promise<string> {
  const school = unwrap(
    await supabase
      .from('growth_schools')
      .insert({ name, created_by: userId })
      .select('id')
      .single(),
  ) as unknown as { id: string };
  const { error } = await supabase
    .from('growth_members')
    .insert({ school_id: school.id, user_id: userId, role: 'owner' });
  if (error) throw new Error(error.message);
  return school.id;
}

export async function createInvite(
  schoolId: string,
  role: MemberRole,
  userId: string,
  studentId?: string,
): Promise<string> {
  const code = makeInviteCode();
  const { error } = await supabase.from('growth_invites').insert({
    code,
    school_id: schoolId,
    role,
    student_id: studentId ?? null,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  return code;
}

export async function listInvites(schoolId: string) {
  return unwrap(
    await supabase
      .from('growth_invites')
      .select('code, role, student_id, used_at, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false }),
  ) as unknown as { code: string; role: MemberRole; student_id: string | null; used_at: string | null }[];
}

export async function redeemInvite(code: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.rpc('growth_redeem_invite', {
    p_code: normalizeInviteCode(code),
    p_name: displayName,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function listMembers(schoolId: string) {
  return unwrap(
    await supabase
      .from('growth_members')
      .select('id, user_id, role, display_name, active')
      .eq('school_id', schoolId),
  ) as unknown as { id: string; user_id: string; role: MemberRole; display_name: string; active: boolean }[];
}

// ───────────────────────── 학생 ─────────────────────────

export async function listStudents(schoolId: string): Promise<GrowthStudent[]> {
  return unwrap(
    await supabase
      .from('growth_students')
      .select('*')
      .eq('school_id', schoolId)
      .eq('active', true)
      .order('name'),
  ) as unknown as GrowthStudent[];
}

export async function getStudent(id: string): Promise<GrowthStudent | null> {
  const { data, error } = await supabase.from('growth_students').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GrowthStudent) ?? null;
}

export async function createStudent(schoolId: string, name: string, grade: string): Promise<string> {
  const row = unwrap(
    await supabase.from('growth_students').insert({ school_id: schoolId, name, grade }).select('id').single(),
  ) as unknown as { id: string };
  return row.id;
}

export async function updateStudent(id: string, patch: Partial<GrowthStudent>): Promise<void> {
  const { error } = await supabase
    .from('growth_students')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ───────────────────────── 출결 ─────────────────────────

export async function listAttendance(studentIds: string[], from: string, to: string) {
  if (!studentIds.length) return [] as GrowthAttendanceRow[];
  return unwrap(
    await supabase
      .from('growth_attendance')
      .select('*')
      .in('student_id', studentIds)
      .gte('on_date', from)
      .lte('on_date', to),
  ) as unknown as GrowthAttendanceRow[];
}

/**
 * 출결을 찍는다. `(student_id, on_date)` 유일 제약 + upsert 다 —
 * 지각으로 찍었다가 출석으로 고치는 일이 흔한데, 두 줄이 남으면 그 달 출결이
 * 두 번 세어진다.
 */
export async function setAttendance(
  studentId: string,
  date: string,
  status: AttendanceStatus,
  userId: string,
  reason = '',
): Promise<void> {
  const { error } = await supabase.from('growth_attendance').upsert(
    {
      student_id: studentId,
      on_date: date,
      status,
      reason,
      recorded_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,on_date' },
  );
  if (error) throw new Error(error.message);
}

// ───────────────────────── 일일 기록 ─────────────────────────

export async function listRecords(studentIds: string[], from: string, to: string) {
  if (!studentIds.length) return [] as GrowthRecordRow[];
  return unwrap(
    await supabase
      .from('growth_records')
      .select('*')
      .in('student_id', studentIds)
      .gte('on_date', from)
      .lte('on_date', to)
      .order('on_date', { ascending: false }),
  ) as unknown as GrowthRecordRow[];
}

export async function listStudentRecords(studentId: string, limit = 120) {
  return unwrap(
    await supabase
      .from('growth_records')
      .select('*')
      .eq('student_id', studentId)
      .order('on_date', { ascending: false })
      .limit(limit),
  ) as unknown as GrowthRecordRow[];
}

export type NewRecord = {
  area: GrowthArea;
  level: GrowthLevel | null;
  subject: string;
  body: string;
  visibility: RecordVisibility;
  next_action: string;
};

/**
 * 여러 학생에게 같은 활동을 한 번에 적는다(기획서 §4.2 마지막 줄).
 *
 * 한 줄씩 스무 번 보내면 중간에 끊길 때 절반만 남고, 무엇보다 느리다.
 * 한 번에 넣는다.
 */
export async function addRecords(
  schoolId: string,
  studentIds: string[],
  date: string,
  record: NewRecord,
  userId: string,
): Promise<number> {
  if (!studentIds.length) return 0;
  const rows = studentIds.map((student_id) => ({
    student_id,
    school_id: schoolId,
    on_date: date,
    ...record,
    author_id: userId,
  }));
  const { error } = await supabase.from('growth_records').insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function updateRecord(id: string, patch: Partial<GrowthRecordRow>): Promise<void> {
  const { error } = await supabase
    .from('growth_records')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from('growth_records').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ───────────────────────── 체험활동 ─────────────────────────

export async function listActivities(schoolId: string): Promise<GrowthActivity[]> {
  return unwrap(
    await supabase
      .from('growth_activities')
      .select('*')
      .eq('school_id', schoolId)
      .order('on_date', { ascending: false }),
  ) as unknown as GrowthActivity[];
}

export async function getActivity(id: string): Promise<GrowthActivity | null> {
  const { data, error } = await supabase.from('growth_activities').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GrowthActivity) ?? null;
}

export async function createActivity(
  schoolId: string,
  title: string,
  onDate: string,
  userId: string,
): Promise<string> {
  const row = unwrap(
    await supabase
      .from('growth_activities')
      .insert({ school_id: schoolId, title, on_date: onDate, created_by: userId })
      .select('id')
      .single(),
  ) as unknown as { id: string };
  return row.id;
}

export async function updateActivity(id: string, patch: Partial<GrowthActivity>): Promise<void> {
  const { error } = await supabase
    .from('growth_activities')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listParticipants(activityId: string): Promise<GrowthParticipant[]> {
  return unwrap(
    await supabase.from('growth_activity_participants').select('*').eq('activity_id', activityId),
  ) as unknown as GrowthParticipant[];
}

export async function listParticipantsForStudents(studentIds: string[]): Promise<GrowthParticipant[]> {
  if (!studentIds.length) return [];
  return unwrap(
    await supabase.from('growth_activity_participants').select('*').in('student_id', studentIds),
  ) as unknown as GrowthParticipant[];
}

export async function setParticipants(activityId: string, studentIds: string[]): Promise<void> {
  if (!studentIds.length) return;
  const { error } = await supabase
    .from('growth_activity_participants')
    .upsert(
      studentIds.map((student_id) => ({ activity_id: activityId, student_id })),
      { onConflict: 'activity_id,student_id', ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function updateParticipant(id: string, patch: Partial<GrowthParticipant>): Promise<void> {
  const { error } = await supabase
    .from('growth_activity_participants')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function removeParticipant(id: string): Promise<void> {
  const { error } = await supabase.from('growth_activity_participants').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ───────────────────────── 목표·상담 ─────────────────────────

export async function listGoals(studentId: string): Promise<GrowthGoal[]> {
  return unwrap(
    await supabase.from('growth_goals').select('*').eq('student_id', studentId).order('created_at'),
  ) as unknown as GrowthGoal[];
}

export async function addGoal(
  studentId: string,
  horizon: GoalHorizon,
  body: string,
  period: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('growth_goals')
    .insert({ student_id: studentId, horizon, body, period, created_by: userId });
  if (error) throw new Error(error.message);
}

export async function setGoalStatus(id: string, status: GrowthGoal['status']): Promise<void> {
  const { error } = await supabase
    .from('growth_goals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listMentoringNotes(studentId: string): Promise<GrowthMentoringNote[]> {
  return unwrap(
    await supabase
      .from('growth_mentoring_notes')
      .select('*')
      .eq('student_id', studentId)
      .order('on_date', { ascending: false }),
  ) as unknown as GrowthMentoringNote[];
}

export async function addMentoringNote(
  studentId: string,
  date: string,
  kind: GrowthMentoringNote['kind'],
  body: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('growth_mentoring_notes')
    .insert({ student_id: studentId, on_date: date, kind, body, author_id: userId });
  if (error) throw new Error(error.message);
}

// ───────────────────────── 월간 보고서 ─────────────────────────

export async function listReports(studentIds: string[], period: string): Promise<GrowthReport[]> {
  if (!studentIds.length) return [];
  return unwrap(
    await supabase.from('growth_monthly_reports').select('*').in('student_id', studentIds).eq('period', period),
  ) as unknown as GrowthReport[];
}

export async function getReport(studentId: string, period: string): Promise<GrowthReport | null> {
  const { data, error } = await supabase
    .from('growth_monthly_reports')
    .select('*')
    .eq('student_id', studentId)
    .eq('period', period)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GrowthReport) ?? null;
}

export async function saveReport(
  studentId: string,
  period: string,
  patch: Partial<GrowthReport>,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('growth_monthly_reports').upsert(
    {
      student_id: studentId,
      period,
      ...patch,
      created_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,period' },
  );
  if (error) throw new Error(error.message);
}

/**
 * 보호자에게 보낸다.
 *
 * **보호자는 `sent` 인 것만 읽는다**(0084 정책). 상태를 올리는 이 한 줄이
 * 공개 스위치다 — 화면에서 거르지 않는 이유가 이것이다.
 */
export async function sendReport(studentId: string, period: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('growth_monthly_reports')
    .update({ status: 'sent', approved_by: userId, approved_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('period', period);
  if (error) throw new Error(error.message);
}

// ───────────────────────── 공지 ─────────────────────────

export async function listNotices(schoolId: string): Promise<GrowthNotice[]> {
  return unwrap(
    await supabase
      .from('growth_notices')
      .select('*')
      .eq('school_id', schoolId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
  ) as unknown as GrowthNotice[];
}

export async function addNotice(schoolId: string, title: string, body: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('growth_notices')
    .insert({ school_id: schoolId, title, body, created_by: userId });
  if (error) throw new Error(error.message);
}

// ───────────────────────── 사진 ─────────────────────────

/**
 * 비공개 통이라 주소를 바로 못 쓴다. 볼 때마다 한 시간짜리 서명 주소를 받는다
 * (0080 의 사역 자료와 같은 방식).
 */
export async function growthMediaUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('growth-media').createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/**
 * 사진 올리기.
 *
 * 파일 종류를 주소에서 짐작하지 않는다 — 웹에서 고른 사진은 `blob:` 주소라
 * 확장자가 없다(0082 에서 녹음 파일로 같은 함정을 밟았다). 응답의
 * `content-type` 에 직접 묻는다.
 */
export async function uploadGrowthMedia(localUri: string, folder: string): Promise<string> {
  const res = await fetch(localUri);
  const blob = await res.blob();
  const type = blob.type || res.headers.get('content-type') || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webm') ? 'webm' : type.includes('mp4') ? 'mp4' : 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('growth-media').upload(path, blob, { contentType: type });
  if (error) throw new Error(error.message);
  return path;
}
