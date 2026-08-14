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

/** 지금까지 본 퀴즈 중 최고 점수. 하나도 안 봤으면 0. */
export async function getBestQuizScore(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('reading_helper_day_records')
    .select('quiz_score')
    .eq('user_id', userId)
    .not('quiz_score', 'is', null)
    .order('quiz_score', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.quiz_score ?? 0;
}
