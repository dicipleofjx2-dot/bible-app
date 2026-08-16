import { supabase } from '@/lib/supabase';
import { getAllDiaryEntries, getAllGratitudeEntries, getAllMarks, getAllMeditationNotes } from '@/db/userData';

// ============================================================
// 타입
// ============================================================

export type Course = {
  id: string;
  title: string;
  description: string;
  totalWeeks: number;
  leaderMessage: string;
  isPublished: boolean;
  createdAt: string;
};

export type CourseWeek = {
  id: string;
  courseId: string;
  weekNumber: number;
  title: string;
  theme: string;
  description: string;
};

export type Mission = {
  id: string;
  courseId: string;
  weekNumber: number;
  body: string;
};

export type ActiveEnrollment = {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  leaderMessage: string;
  totalWeeks: number;
  currentWeek: number;
  startedAt: string;
};

// r2m_daily_checkins에서 오는 5개(로컬-핑) + prayer_logs/reading_helper에서 오는 2개.
export type DailyChecklist = {
  qt: boolean;
  reading: boolean;
  meditation: boolean;
  prayer: boolean;
  memorization: boolean;
  obedience: boolean;
  gratitude: boolean;
};

const EMPTY_CHECKLIST: DailyChecklist = {
  qt: false,
  reading: false,
  meditation: false,
  prayer: false,
  memorization: false,
  obedience: false,
  gratitude: false,
};

export type ProgressCounts = {
  qt: number;
  reading: number;
  meditation: number;
  prayer: number;
  memorization: number;
  obedience: number;
  gratitude: number;
};

export type EnrolledUserStatus = {
  userId: string;
  username: string;
  /** 훈련과정에 등록하지 않은 멤버는 빈 문자열 */
  courseTitle: string;
  /** 등록하지 않았으면 null */
  startedAt: string | null;
  today: DailyChecklist;
  lastActivityAt: string | null;
};

/** 리더관리 화면에 들어올 수 있는 자격 */
export type LeaderScope = { isAdmin: boolean; isLeader: boolean };

export type AppMember = {
  userId: string;
  username: string;
  isLeader: boolean;
  /** 이 사람이 속한 리더 (없으면 null) */
  leaderId: string | null;
  leaderName: string | null;
};

function mapCourse(row: any): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    totalWeeks: row.total_weeks,
    leaderMessage: row.leader_message ?? '',
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

function mapWeek(row: any): CourseWeek {
  return {
    id: row.id,
    courseId: row.course_id,
    weekNumber: row.week_number,
    title: row.title,
    theme: row.theme ?? '',
    description: row.description ?? '',
  };
}

function mapMission(row: any): Mission {
  return { id: row.id, courseId: row.course_id, weekNumber: row.week_number, body: row.body };
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 오늘 자정(로컬 타임존)을 UTC ISO 문자열로 반환한다. `${todayDateString()}T00:00:00.000Z`처럼
// 로컬 날짜 숫자에 그대로 Z를 붙이면 KST(UTC+9) 등에서 자정~오전 9시 사이에 남긴 기록이
// "어제"로 판정되는 버그가 생긴다 — Date 생성자로 실제 로컬 자정을 만들고 나서 변환해야 한다.
function startOfTodayISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
}

const READING_QUIZ_PASS_SCORE = 70;

// 등록일 + 총 주차로 현재 주차를 파생한다 — 별도 컬럼 없음.
function computeCurrentWeek(startedAt: string, totalWeeks: number): number {
  const days = Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000);
  return Math.min(totalWeeks, Math.floor(days / 7) + 1);
}

// ============================================================
// 훈련과정 (공개 조회)
// ============================================================

export async function getPublishedCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('r2m_courses')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCourse);
}

export async function getCourseById(id: string): Promise<Course | null> {
  const { data, error } = await supabase.from('r2m_courses').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapCourse(data) : null;
}

export async function getCourseWeeks(courseId: string): Promise<CourseWeek[]> {
  const { data, error } = await supabase
    .from('r2m_course_weeks')
    .select('*')
    .eq('course_id', courseId)
    .order('week_number', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapWeek);
}

export async function getMissionsForWeek(courseId: string, weekNumber: number): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('r2m_missions')
    .select('*')
    .eq('course_id', courseId)
    .eq('week_number', weekNumber)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMission);
}

// 관리자 화면에서 과정 하나의 미션을 주차 구분 없이 한 번에 보여줄 때 사용.
export async function getAllMissionsForCourse(courseId: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('r2m_missions')
    .select('*')
    .eq('course_id', courseId)
    .order('week_number', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMission);
}

// ============================================================
// 등록 (enrollment)
// ============================================================

export async function getMyEnrollmentForCourse(userId: string, courseId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('r2m_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .is('completed_at', null)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function enrollInCourse(userId: string, courseId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('r2m_enrollments').insert({ user_id: userId, course_id: courseId });
  return { error: error?.message };
}

// 완료되지 않은 가장 최근 등록을 "현재 과정"으로 삼는다. 계산된 주차가 총 주차를 넘으면
// 이번 조회에서 자동으로 completed_at을 채우고(수료 처리), 활성 과정 없음으로 반환한다.
export async function getMyActiveEnrollment(userId: string): Promise<ActiveEnrollment | null> {
  const { data, error } = await supabase
    .from('r2m_enrollments')
    .select('id, course_id, started_at, r2m_courses(title, total_weeks, leader_message)')
    .eq('user_id', userId)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const course = (data as any).r2m_courses;
  if (!course) return null;

  const currentWeek = computeCurrentWeek(data.started_at, course.total_weeks);
  if (currentWeek > course.total_weeks) {
    await supabase.from('r2m_enrollments').update({ completed_at: new Date().toISOString() }).eq('id', data.id);
    return null;
  }

  return {
    enrollmentId: data.id,
    courseId: data.course_id,
    courseTitle: course.title,
    leaderMessage: course.leader_message ?? '',
    totalWeeks: course.total_weeks,
    currentWeek,
    startedAt: data.started_at,
  };
}

// ============================================================
// 오늘의 훈련 — 로컬 항목 완료 핑 (내용은 절대 전송하지 않음, 불리언만)
// ============================================================

export async function pingCheckin(
  userId: string,
  date: string,
  patch: Partial<Pick<DailyChecklist, 'qt' | 'meditation' | 'obedience' | 'gratitude'>>,
): Promise<void> {
  await supabase
    .from('r2m_daily_checkins')
    .upsert({ user_id: userId, date, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
}

export async function logPrayer(userId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('prayer_logs').insert({ user_id: userId });
  return { error: error?.message };
}

export async function hasPrayerLogToday(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('prayer_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfTodayISO());
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function getTodayChecklist(userId: string): Promise<DailyChecklist> {
  const date = todayDateString();
  const [checkinResult, prayerLogged, readingHelperResult] = await Promise.all([
    supabase.from('r2m_daily_checkins').select('*').eq('user_id', userId).eq('date', date).maybeSingle(),
    hasPrayerLogToday(userId),
    supabase
      .from('reading_helper_day_records')
      .select('quiz_score, memorization_success')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle(),
  ]);

  const checkin = checkinResult.data as any;
  const readingHelper = readingHelperResult.data as any;
  return {
    qt: !!checkin?.qt,
    // 성경읽기 완료는 자유 읽기 여부가 아니라 성경통독도우미 퀴즈 점수로 판정한다.
    reading: (readingHelper?.quiz_score ?? 0) >= READING_QUIZ_PASS_SCORE,
    meditation: !!checkin?.meditation,
    obedience: !!checkin?.obedience,
    gratitude: !!checkin?.gratitude,
    prayer: prayerLogged,
    memorization: !!readingHelper?.memorization_success,
  };
}

export async function getTodayChecklistCount(userId: string): Promise<number> {
  const checklist = await getTodayChecklist(userId).catch(() => EMPTY_CHECKLIST);
  return Object.values(checklist).filter(Boolean).length;
}

// ============================================================
// 성장기록 — 점수/등급/랭킹 없이 누적 카운트만
// ============================================================

export async function getProgressCounts(userId: string): Promise<ProgressCounts> {
  const [qtNotes, marks, diaryEntries, gratitudeEntries, readingResult, prayerResult, memoResult] = await Promise.all([
    getAllMeditationNotes(),
    getAllMarks(),
    getAllDiaryEntries(),
    getAllGratitudeEntries(),
    supabase
      .from('reading_helper_day_records')
      .select('date', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('quiz_score', READING_QUIZ_PASS_SCORE),
    supabase.from('prayer_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('reading_helper_day_records')
      .select('date', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('memorization_success', true),
  ]);

  return {
    qt: qtNotes.length,
    meditation: marks.length,
    obedience: diaryEntries.length,
    gratitude: gratitudeEntries.length,
    reading: readingResult.count ?? 0,
    prayer: prayerResult.count ?? 0,
    memorization: memoResult.count ?? 0,
  };
}

// ============================================================
// 리더관리 (admin 전용 — 완료 여부만, 콘텐츠 컬럼 select 없음)
// ============================================================

/** 리더관리 화면에 들어올 수 있는지 — 관리자이거나 리더이면 된다. */
export async function getLeaderScope(userId: string): Promise<LeaderScope> {
  const [adminResult, leaderResult] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
    supabase.from('r2m_leaders').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);
  return {
    isAdmin: !!(adminResult.data as any)?.is_admin,
    isLeader: !!leaderResult.data,
  };
}

/**
 * 리더관리 화면이 보여줄 사람들.
 *
 * 리더는 자기에게 배정된 멤버만, 관리자는 전체를 본다. 훈련과정에 아직 등록하지
 * 않은 멤버도 빼지 않는다 — 리더가 챙겨야 할 사람이 목록에서 아예 사라지면
 * "등록하라고 말해 줄" 계기가 없어진다. 대신 과정 자리를 비워 표시한다.
 *
 * 어느 쪽이든 완료 여부(불리언)만 가져온다. 묵상·기도 내용은 서버에 없다.
 */
export async function getEnrolledUsersStatus(userId: string, scope: LeaderScope): Promise<EnrolledUserStatus[]> {
  // 리더는 배정표가 곧 명단이다. 관리자는 등록자와 배정된 멤버를 합쳐서 본다.
  const assignmentQuery = supabase.from('r2m_leader_members').select('member_id');
  const [assignmentResult, enrollmentResult] = await Promise.all([
    scope.isAdmin ? assignmentQuery : assignmentQuery.eq('leader_id', userId),
    supabase
      .from('r2m_enrollments')
      .select('user_id, started_at, r2m_courses(title)')
      .is('completed_at', null)
      .order('started_at', { ascending: true }),
  ]);
  if (enrollmentResult.error) throw enrollmentResult.error;

  // 배정표 조회 실패는 치명적으로 다루지 않는다. 앱은 배포되었는데 0035
  // 마이그레이션이 아직 안 돌았으면 이 테이블이 없어서 실패하는데, 그때 통째로
  // 던지면 지금까지 잘 되던 관리자 명단까지 같이 못 보게 된다.
  const assignedIds = (assignmentResult.data ?? []).map((r: any) => r.member_id);
  const enrollmentByUser = new Map<string, any>(
    (enrollmentResult.data ?? []).map((r: any) => [r.user_id, r]),
  );

  const userIds = scope.isAdmin
    ? [...new Set([...enrollmentByUser.keys(), ...assignedIds])]
    : assignedIds;
  if (userIds.length === 0) return [];

  const date = todayDateString();
  const [profileResult, checkinsResult, prayerResult, readingHelperResult] = await Promise.all([
    supabase.from('profiles').select('id, username').in('id', userIds),
    supabase.from('r2m_daily_checkins').select('*').in('user_id', userIds).eq('date', date),
    supabase.from('prayer_logs').select('user_id').in('user_id', userIds).gte('created_at', startOfTodayISO()),
    supabase
      .from('reading_helper_day_records')
      .select('user_id, quiz_score, memorization_success')
      .in('user_id', userIds)
      .eq('date', date),
  ]);

  const nameByUser = new Map<string, string>((profileResult.data ?? []).map((r: any) => [r.id, r.username]));
  const checkinByUser = new Map<string, any>((checkinsResult.data ?? []).map((r: any) => [r.user_id, r]));
  const prayedUsers = new Set((prayerResult.data ?? []).map((r: any) => r.user_id));
  const readingHelperByUser = new Map<string, any>((readingHelperResult.data ?? []).map((r: any) => [r.user_id, r]));

  return userIds
    .map((id) => {
      const checkin = checkinByUser.get(id);
      const readingHelper = readingHelperByUser.get(id);
      const enrollment = enrollmentByUser.get(id);
      return {
        userId: id,
        username: nameByUser.get(id) ?? '익명',
        courseTitle: enrollment?.r2m_courses?.title ?? '',
        startedAt: enrollment?.started_at ?? null,
        today: {
          qt: !!checkin?.qt,
          reading: (readingHelper?.quiz_score ?? 0) >= READING_QUIZ_PASS_SCORE,
          meditation: !!checkin?.meditation,
          obedience: !!checkin?.obedience,
          gratitude: !!checkin?.gratitude,
          prayer: prayedUsers.has(id),
          memorization: !!readingHelper?.memorization_success,
        },
        lastActivityAt: checkin?.updated_at ?? null,
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username, 'ko'));
}

// ============================================================
// 리더 지정과 멤버 배정 (관리자 전용)
// ============================================================

/** 회원 전체를 리더 여부·소속 리더와 함께 가져온다. */
export async function getMembersForAssignment(): Promise<AppMember[]> {
  const [profileResult, leaderResult, assignmentResult] = await Promise.all([
    supabase.from('profiles').select('id, username').order('username', { ascending: true }),
    supabase.from('r2m_leaders').select('user_id'),
    supabase.from('r2m_leader_members').select('member_id, leader_id'),
  ]);
  if (profileResult.error) throw profileResult.error;

  // 위와 같은 이유 — 리더 테이블이 아직 없으면 "리더 없음"으로 보여 준다.
  const leaderIds = new Set((leaderResult.data ?? []).map((r: any) => r.user_id));
  const leaderByMember = new Map<string, string>(
    (assignmentResult.data ?? []).map((r: any) => [r.member_id, r.leader_id]),
  );
  const nameById = new Map<string, string>((profileResult.data ?? []).map((r: any) => [r.id, r.username]));

  return (profileResult.data ?? []).map((row: any) => {
    const leaderId = leaderByMember.get(row.id) ?? null;
    return {
      userId: row.id,
      username: row.username ?? '익명',
      isLeader: leaderIds.has(row.id),
      leaderId,
      leaderName: leaderId ? (nameById.get(leaderId) ?? '익명') : null,
    };
  });
}

export async function setLeader(userId: string, on: boolean, actorId: string): Promise<{ error?: string }> {
  if (on) {
    const { error } = await supabase.from('r2m_leaders').upsert(
      { user_id: userId, created_by: actorId },
      { onConflict: 'user_id' },
    );
    return { error: error?.message };
  }

  // 리더 자격을 뺏으면 그 사람에게 붙어 있던 멤버는 소속이 없어진다. 배정을 그대로
  // 두면 리더가 아닌 사람 이름이 소속으로 남아 다음 배정 때 헷갈린다.
  const { error: unassignError } = await supabase.from('r2m_leader_members').delete().eq('leader_id', userId);
  if (unassignError) return { error: unassignError.message };
  const { error } = await supabase.from('r2m_leaders').delete().eq('user_id', userId);
  return { error: error?.message };
}

/** leaderId가 null이면 소속을 없앤다. 한 사람은 한 리더에게만 속한다. */
export async function assignMemberToLeader(
  memberId: string,
  leaderId: string | null,
  actorId: string,
): Promise<{ error?: string }> {
  if (!leaderId) {
    const { error } = await supabase.from('r2m_leader_members').delete().eq('member_id', memberId);
    return { error: error?.message };
  }
  if (leaderId === memberId) return { error: '자기 자신을 리더로 지정할 수 없어요.' };

  const { error } = await supabase.from('r2m_leader_members').upsert(
    { member_id: memberId, leader_id: leaderId, assigned_by: actorId, assigned_at: new Date().toISOString() },
    { onConflict: 'member_id' },
  );
  return { error: error?.message };
}

// ============================================================
// 관리자 CMS — 과정/주차/미션
// ============================================================

export async function getAllCoursesForAdmin(): Promise<Course[]> {
  const { data, error } = await supabase.from('r2m_courses').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCourse);
}

export async function insertCourse(entry: {
  title: string;
  description: string;
  totalWeeks: number;
  leaderMessage: string;
}): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('r2m_courses')
    .insert({
      title: entry.title,
      description: entry.description,
      total_weeks: entry.totalWeeks,
      leader_message: entry.leaderMessage,
    })
    .select('id')
    .single();
  return { id: data?.id, error: error?.message };
}

export async function updateCourse(
  id: string,
  patch: Partial<{ title: string; description: string; totalWeeks: number; leaderMessage: string; isPublished: boolean }>,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('r2m_courses')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.totalWeeks !== undefined ? { total_weeks: patch.totalWeeks } : {}),
      ...(patch.leaderMessage !== undefined ? { leader_message: patch.leaderMessage } : {}),
      ...(patch.isPublished !== undefined ? { is_published: patch.isPublished } : {}),
    })
    .eq('id', id);
  return { error: error?.message };
}

export async function deleteCourse(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('r2m_courses').delete().eq('id', id);
  return { error: error?.message };
}

export async function upsertCourseWeek(entry: {
  courseId: string;
  weekNumber: number;
  title: string;
  theme: string;
  description: string;
}): Promise<{ error?: string }> {
  const { error } = await supabase.from('r2m_course_weeks').upsert(
    {
      course_id: entry.courseId,
      week_number: entry.weekNumber,
      title: entry.title,
      theme: entry.theme,
      description: entry.description,
    },
    { onConflict: 'course_id,week_number' },
  );
  return { error: error?.message };
}

export async function deleteCourseWeek(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('r2m_course_weeks').delete().eq('id', id);
  return { error: error?.message };
}

export async function insertMission(entry: { courseId: string; weekNumber: number; body: string }): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('r2m_missions')
    .insert({ course_id: entry.courseId, week_number: entry.weekNumber, body: entry.body });
  return { error: error?.message };
}

export async function deleteMission(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('r2m_missions').delete().eq('id', id);
  return { error: error?.message };
}
