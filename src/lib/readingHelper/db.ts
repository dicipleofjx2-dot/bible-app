import { supabase } from '@/lib/supabase';

/** 성경통독도우미 progress storage — unlike bible-quiz-app's original
 * AsyncStorage-first design, this always goes straight to Supabase: every
 * screen here already requires a logged-in 데이빗바이블 session (see the
 * `requiresAuth` home-screen tile), so there's no offline-first case to
 * design around, and it avoids carrying a second local cache to keep in
 * sync with the server. */

export async function getStartDate(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('reading_helper_progress')
    .select('start_date')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.start_date ?? null;
}

export async function setStartDate(userId: string, dateStr: string): Promise<void> {
  const { error } = await supabase
    .from('reading_helper_progress')
    .upsert({ user_id: userId, start_date: dateStr }, { onConflict: 'user_id' });
  if (error) throw error;
}

export type DayRecord = {
  date: string;
  reading_complete: boolean;
  quiz_score: number | null;
  memorization_success: boolean | null;
  memorization_attempts: number | null;
};

async function upsertDayRecord(userId: string, dateStr: string, patch: Partial<DayRecord>): Promise<void> {
  const { error } = await supabase.from('reading_helper_day_records').upsert(
    { user_id: userId, date: dateStr, updated_at: new Date().toISOString(), ...patch },
    { onConflict: 'user_id,date' }
  );
  if (error) throw error;
}

/** One call for everything recorded on a given day — prefer this over the
 * single-field getters below when a screen needs more than one field, since
 * each getter is its own round trip. */
export async function getDayRecord(userId: string, dateStr: string): Promise<DayRecord | null> {
  const { data, error } = await supabase
    .from('reading_helper_day_records')
    .select('date, reading_complete, quiz_score, memorization_success, memorization_attempts')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setReadingComplete(userId: string, dateStr: string, complete: boolean): Promise<void> {
  await upsertDayRecord(userId, dateStr, { reading_complete: complete });
}

export async function setQuizScore(userId: string, dateStr: string, score: number): Promise<void> {
  await upsertDayRecord(userId, dateStr, { quiz_score: score });
}

export type MemorizationResult = { success: boolean; attemptsUsed: number };

export async function setMemorizationResult(
  userId: string,
  dateStr: string,
  result: MemorizationResult
): Promise<void> {
  await upsertDayRecord(userId, dateStr, {
    memorization_success: result.success,
    memorization_attempts: result.attemptsUsed,
  });
}

/** Every date with any recorded activity — used for the 아카이브 체크 표시와
 * 통독 캘린더 점. */
export async function getAllRecordDates(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('reading_helper_day_records').select('date').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.date as string));
}

/** 통독을 처음부터 다시 시작한다. 시작일과 그동안의 기록을 모두 지우므로
 * Day 1로 돌아가고 포인트도 0이 된다(포인트는 기록에서 계산되기 때문).
 * 시작일 행까지 지워야 홈 화면이 온보딩으로 다시 보내 새 시작일을 잡는다. */
export async function resetProgress(userId: string): Promise<void> {
  const { error: recordsError } = await supabase
    .from('reading_helper_day_records')
    .delete()
    .eq('user_id', userId);
  if (recordsError) throw recordsError;

  const { error: progressError } = await supabase
    .from('reading_helper_progress')
    .delete()
    .eq('user_id', userId);
  if (progressError) throw progressError;
}

/** 말씀카드 잠금 해제 기준 — 어느 날짜든 하루라도 이 점수 이상을 맞으면 된다. */
export const WORD_CARD_MIN_QUIZ_SCORE = 80;

/** 암송 퍼즐을 성공했을 때 주는 포인트 */
export const MEMORIZATION_POINTS = 10;

/** 퀴즈 점수를 포인트로 환산한다. 80점 미만은 0점 —
 * 말씀카드 잠금 해제 기준과 같은 선이라 "80점"이 하나의 기준으로 읽힌다. */
export function quizPoints(score: number | null | undefined): number {
  if (score == null) return 0;
  if (score >= 100) return 30;
  if (score >= 90) return 20;
  if (score >= WORD_CARD_MIN_QUIZ_SCORE) return 10;
  return 0;
}

export type PointsSummary = {
  total: number;
  quiz: number;
  memorization: number;
  /** 포인트를 받은 퀴즈 횟수 (80점 이상만) */
  quizCount: number;
  /** 암송 성공 횟수 */
  memorizationCount: number;
};

/** 지금까지 쌓인 포인트. 별도 테이블을 두지 않고 그날그날의 기록에서 계산한다 —
 * 기록이 곧 근거라 따로 관리하다 어긋날 일이 없고, 통독을 리셋하면 함께 0이 된다. */
export async function getPointsSummary(userId: string): Promise<PointsSummary> {
  const { data, error } = await supabase
    .from('reading_helper_day_records')
    .select('quiz_score, memorization_success')
    .eq('user_id', userId);
  if (error) throw error;

  const summary: PointsSummary = { total: 0, quiz: 0, memorization: 0, quizCount: 0, memorizationCount: 0 };
  for (const row of data ?? []) {
    const earned = quizPoints(row.quiz_score as number | null);
    if (earned > 0) {
      summary.quiz += earned;
      summary.quizCount += 1;
    }
    if (row.memorization_success) {
      summary.memorization += MEMORIZATION_POINTS;
      summary.memorizationCount += 1;
    }
  }
  summary.total = summary.quiz + summary.memorization;
  return summary;
}

/**
 * 오늘 푼 퀴즈 점수. 아직 안 풀었으면 0.
 *
 * 말씀카드는 "오늘" 기능이다 — 그날 퀴즈를 풀어 기준 점수를 넘겨야 그날 카드를
 * 만들 수 있다. 예전에는 역대 최고 점수를 봤는데, 그러면 한 번 90점을 맞은
 * 사람은 그 뒤로 퀴즈를 안 풀어도 계속 열려 있어 조건이 사실상 없어졌다.
 *
 * 지난 날짜를 복습으로 다시 푸는 것은 기록에 저장되지 않으므로 여기에 잡히지 않는다.
 */
export async function getTodayQuizScore(userId: string, dateStr: string): Promise<number> {
  const { data, error } = await supabase
    .from('reading_helper_day_records')
    .select('quiz_score')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();
  if (error) throw error;
  return data?.quiz_score ?? 0;
}

/**
 * 지금 로그인이 서버에서도 살아 있는지.
 *
 * 앱에는 로그인한 것처럼 보여도 토큰이 만료돼 서버가 거부하는 상태가 있다.
 * 그때 조회는 오류 없이 0건으로 돌아오기 때문에 "자료가 없다"와 구분되지 않는다.
 * 서버에 한 번 물어 그 둘을 가른다.
 */
/**
 * 로그인이 정말 끊겼는지 가른다.
 *
 * 예전에는 `getUser()` 를 한 번 물어보고 실패하면 곧장 "만료"로 단정했다.
 * 그런데 그 호출은 **토큰이 막 만료된 순간**이나 **잠깐 끊긴 네트워크**에서도
 * 실패한다. 데이빗바이블에 멀쩡히 로그인해 둔 사람이 통독도우미에 들어올
 * 때마다 "다시 로그인하세요"를 만나는 이유가 이것이었다.
 *
 * 그래서 끊겼다고 말하기 전에 **갱신을 먼저 시도한다.** 담아 둔 갱신표가
 * 살아 있으면 조용히 새 토큰을 받아 그대로 이어진다. 갱신까지 실패해야
 * 비로소 끊긴 것이다.
 */
export async function hasLiveSession(): Promise<boolean> {
  const { data: first, error: firstError } = await supabase.auth.getUser();
  if (!firstError && first.user) return true;

  // 담아 둔 갱신표로 새 토큰을 받아 본다.
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed.user) return true;

  // 갱신표조차 없으면 진짜로 로그아웃 상태다. 갱신표는 있는데 서버에 못 닿은
  // 것이라면(비행기 모드 등) 끊겼다고 하지 않는다 — 잠시 뒤 저절로 풀린다.
  const { data: stored } = await supabase.auth.getSession();
  return !!stored.session;
}
