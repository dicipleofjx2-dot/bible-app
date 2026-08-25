import { supabase } from '@/lib/supabase';
import { todayDateString } from './readingPlan';

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
  /** 3초 OX 퀴즈를 10문제 다 맞혔는지 */
  speed_quiz_success: boolean | null;
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
    .select('date, reading_complete, quiz_score, memorization_success, memorization_attempts, speed_quiz_success')
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

/** 3초 OX 퀴즈 결과. 다 맞혔을 때만 기록한다 — 틀린 판은 남기지 않는다.
 * 몇 번을 다시 하든 상관없고, 한 번 다 맞히면 그날 10점이다. */
export async function setSpeedQuizSuccess(userId: string, dateStr: string): Promise<void> {
  await upsertDayRecord(userId, dateStr, { speed_quiz_success: true });
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

/**
 * 그날을 **마쳤다**고 볼 날들. 달력의 체크와 아카이브 표시가 이것을 본다.
 *
 * 기준은 **그날 성경퀴즈 80점 이상** 하나다. 예전에는
 *   · 기록이 하나라도 있으면(퀴즈를 한 문제만 풀어 봐도) 체크가 됐고,
 *   · 「오늘 통독 완료」 체크박스는 그냥 누르기만 하면 됐다.
 * 둘 다 실제로 읽었는지와는 상관이 없다. 퀴즈 80점은 본문을 읽지 않고는 잘
 * 나오지 않으므로, 이것만이 스스로에게 정직한 표시가 된다.
 *
 * ⚠️ 이 기준은 달력·아카이브·밀린 날·관리자 현황판·저녁 알림이 **모두 같이**
 *    본다. 한 곳만 고치면 "달력엔 체크인데 밀렸다고 나온다"가 된다.
 */
export async function getCompletedDates(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('reading_helper_day_records')
    .select('date, quiz_score')
    .eq('user_id', userId)
    .gte('quiz_score', WORD_CARD_MIN_QUIZ_SCORE);
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

/**
 * 포인트를 세기 시작하는 날 (YYYY-MM-DD).
 *
 * 이 날부터의 기록만 점수·순위·상점 잔액에 들어간다. 그 전 기록은 시험 삼아
 * 눌러 본 것이 섞여 있어 순위의 근거가 되기 어렵다.
 *
 * ⚠️ DB 쪽 같은 규칙은 reading_helper_points_since() 다(0054). **둘은 반드시
 *    같은 날짜여야 한다** — 어긋나면 화면의 내 점수와 순위표·상점 잔액이
 *    서로 다른 숫자를 말한다. 날짜를 바꿀 때는 두 곳을 함께 고칠 것.
 */
export const POINTS_START_DATE = '2026-08-19';

/** 암송 퍼즐을 성공했을 때 주는 포인트 */
export const MEMORIZATION_POINTS = 10;

/** 3초 OX 퀴즈 10문제를 다 맞혔을 때 주는 포인트. 부분 점수는 없다. */
export const SPEED_QUIZ_POINTS = 10;

/** 퀴즈 점수를 포인트로 환산한다. 80점 미만은 0점 —
 * 말씀카드 잠금 해제 기준과 같은 선이라 "80점"이 하나의 기준으로 읽힌다. */
export function quizPoints(score: number | null | undefined): number {
  if (score == null) return 0;
  if (score >= 100) return 30;
  if (score >= 90) return 20;
  if (score >= WORD_CARD_MIN_QUIZ_SCORE) return 10;
  return 0;
}

/** 연속으로 빠진 날이 3의 배수가 되는 날에 매기는 큰 벌점 */
export const MISS_PENALTY_BIG = 50;

/** 그 밖에 하루 빠질 때마다 매기는 벌점 */
export const MISS_PENALTY = 10;

export type PointsSummary = {
  /** 벌점을 뺀 점수. 0 아래로는 안 내려간다 */
  total: number;
  quiz: number;
  memorization: number;
  speedQuiz: number;
  /** 포인트를 받은 퀴즈 횟수 (80점 이상만) */
  quizCount: number;
  /** 암송 성공 횟수 */
  memorizationCount: number;
  /** 3초 OX 퀴즈 만점 횟수 */
  speedQuizCount: number;
  /** 빠진 날 수 (개인 시작일 이후, 어제까지) */
  missedDays: number;
  /** 빠진 날 벌점 합계. total 에서 이미 빠져 있다 */
  penalty: number;
};

/** 지금까지 쌓인 포인트. 별도 테이블을 두지 않고 그날그날의 기록에서 계산한다 —
 * 기록이 곧 근거라 따로 관리하다 어긋날 일이 없고, 통독을 리셋하면 함께 0이 된다.
 *
 * POINTS_START_DATE 이후 기록만 센다. 통독 진척(마친 날 수 등)은 자르지 않는다 —
 * 그건 포인트가 아니라 얼마나 걸어왔는가다. */
export async function getPointsSummary(userId: string): Promise<PointsSummary> {
  const { data, error } = await supabase
    .from('reading_helper_day_records')
    .select('date, quiz_score, memorization_success, speed_quiz_success')
    .eq('user_id', userId)
    .gte('date', POINTS_START_DATE);
  if (error) throw error;

  const summary: PointsSummary = {
    total: 0,
    quiz: 0,
    memorization: 0,
    speedQuiz: 0,
    quizCount: 0,
    memorizationCount: 0,
    speedQuizCount: 0,
    missedDays: 0,
    penalty: 0,
  };
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
    if (row.speed_quiz_success) {
      summary.speedQuiz += SPEED_QUIZ_POINTS;
      summary.speedQuizCount += 1;
    }
  }
  // 빠진 날 벌점. DB 의 reading_helper_penalties() 와 **같은 규칙**이어야 한다 —
  // 어긋나면 내 화면의 점수와 순위표가 서로 다른 숫자를 말한다.
  const done = new Set(
    (data ?? [])
      .filter((row) => (row.quiz_score as number | null) != null && (row.quiz_score as number) >= WORD_CARD_MIN_QUIZ_SCORE)
      .map((row) => String(row.date)),
  );
  const { data: progress } = await supabase
    .from('reading_helper_progress')
    .select('start_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (progress?.start_date) {
    const from = String(progress.start_date) > POINTS_START_DATE ? String(progress.start_date) : POINTS_START_DATE;
    // 오늘은 세지 않는다 — 아직 하루가 안 갔는데 안 했다고 깎으면 안 된다.
    const yesterday = new Date(`${todayDateString()}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    let streak = 0;
    for (let d = new Date(`${from}T00:00:00Z`); d <= yesterday; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (done.has(key)) {
        streak = 0;
        continue;
      }
      streak += 1;
      summary.missedDays += 1;
      summary.penalty += streak % 3 === 0 ? MISS_PENALTY_BIG : MISS_PENALTY;
    }
  }

  // 0 에서 막는다. 음수를 보면 다시 시작할 엄두가 안 난다.
  summary.total = Math.max(
    summary.quiz + summary.memorization + summary.speedQuiz - summary.penalty,
    0,
  );
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

/**
 * 오늘 몇 명이 함께 읽었는가.
 *
 * 이름은 오지 않는다(0044). 숫자 둘뿐이다 — 누가 했는지 보이면 못 한 사람이
 * 부끄러워 아예 안 들어오기 때문이다.
 *
 * 실패해도 던지지 않는다. 이건 곁들이는 한 줄이라, 못 세었다고 통독 화면이
 * 통째로 안 뜨면 안 된다.
 */
export async function getTogetherToday(): Promise<{ readToday: number; joinedTotal: number } | null> {
  const { data, error } = await supabase.rpc('reading_helper_today_together');
  if (error || !data || data.length === 0) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return { readToday: row.read_today ?? 0, joinedTotal: row.joined_total ?? 0 };
}

/**
 * 통독을 마치지 **못한** 날들. 어제까지만 본다.
 *
 * 오늘은 아직 하루가 안 갔으니 빠뜨린 것이 아니다. 시작일 전도 아니다.
 *
 * 마쳤는지는 **그날 성경퀴즈 80점 이상**으로 본다(getCompletedDates). 눌러서
 * 표시하는 「통독 완료」는 실제로 읽었는지와 상관이 없어 기준으로 쓸 수 없다.
 */
export async function getMissedDates(userId: string, startDate: string, todayStr: string): Promise<string[]> {
  // 「그날을 마쳤다」의 기준은 한 곳뿐이다 — getCompletedDates(퀴즈 80점 이상).
  const done = await getCompletedDates(userId);

  const missed: string[] = [];
  const d = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${todayStr}T00:00:00`);
  while (d < end) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!done.has(key)) missed.push(key);
    d.setDate(d.getDate() + 1);
  }
  return missed;
}

export type RankRow = {
  rank: number;
  displayName: string;
  /** 총점. 순위는 이것으로 세운다. */
  points: number;
  /** 이번 주 점수. 순위에는 안 쓰고 곁에 보여만 준다. */
  weekPoints: number;
  /** 교환소에서 산 칭호·배지(0051). 없으면 빈 문자열. */
  titleLabel: string;
  titleEmoji: string;
  badgeEmoji: string;
  isMe: boolean;
};

/**
 * 통독 점수 상위 다섯.
 *
 * **총점으로 세우고** 이번 주 점수를 함께 받는다(0049). 처음에는 이번 주로만
 * 세웠는데(0046), 화면에 뜨는 숫자가 그동안 쌓아 온 것에 비해 너무 작아
 * 지금까지 걸어온 길이 순위에 안 보였다.
 *
 * 이름은 서버에서 가려 온다. 지금 82명 중 65명의 닉네임이 이메일 주소 그대로라,
 * 그대로 띄우면 순위표가 교인 이메일 명부가 된다.
 */
export async function getWeeklyRanking(topN = 5): Promise<RankRow[]> {
  const { data, error } = await supabase.rpc('reading_helper_ranking', { top_n: topN });
  if (error || !data) return [];
  return (
    data as Array<{
      rank: number;
      display_name: string;
      points: number;
      week_points: number;
      title_label: string;
      title_emoji: string;
      badge_emoji: string;
      is_me: boolean;
    }>
  ).map((r) => ({
    rank: r.rank,
    displayName: r.display_name,
    points: r.points,
    weekPoints: r.week_points ?? 0,
    titleLabel: r.title_label ?? '',
    titleEmoji: r.title_emoji ?? '',
    badgeEmoji: r.badge_emoji ?? '',
    isMe: Boolean(r.is_me),
  }));
}

/** 내 순위(총점 기준). 다섯 등 밖이어도 자기 자리는 알아야 「조금만 더」가 된다. */
export async function getMyRank(): Promise<{ rank: number; points: number; total: number } | null> {
  const { data, error } = await supabase.rpc('reading_helper_my_rank');
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return { rank: row.rank, points: row.points, total: row.total };
}

export type AdminBoardRow = {
  userId: string;
  displayName: string;
  startDate: string;
  dayNumber: number;
  doneDays: number;
  missedDays: number;
  lastDone: string | null;
  weekPoints: number;
  totalPoints: number;
};

/**
 * 관리자용 통독 현황판(0047).
 *
 * 순위표와 달리 **이름을 가리지 않는다** — 격려하려면 누구인지 알아야 한다.
 * 관리자인지는 서버 함수 첫 줄에서 확인하므로, 관리자가 아니면 여기서 오류가
 * 온다(화면에서도 한 번 더 거른다).
 */
export async function getAdminBoard(): Promise<AdminBoardRow[]> {
  const { data, error } = await supabase.rpc('reading_helper_admin_board');
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map((r) => ({
    userId: String(r.user_id),
    displayName: String(r.display_name ?? '이름 없음'),
    startDate: String(r.start_date ?? ''),
    dayNumber: Number(r.day_number ?? 0),
    doneDays: Number(r.done_days ?? 0),
    missedDays: Number(r.missed_days ?? 0),
    lastDone: (r.last_done as string | null) ?? null,
    weekPoints: Number(r.week_points ?? 0),
    totalPoints: Number(r.total_points ?? 0),
  }));
}
