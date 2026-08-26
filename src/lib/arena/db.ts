import { supabase } from '@/lib/supabase';

/** 성경게임대전 기록. → docs/arena/README.md
 *
 * 방(문제·정답)은 코드에 있고 DB 에는 기록만 남는다. */

/** 한 방에 들어갈 수 있는 횟수. 넘으면 기록이 안 남는다(정책으로도 막힌다).
 *
 * 최고 기록이 아니라 **두 판 평균**으로 재는 이유는 0060 마이그레이션 머리말에
 * 적었다 — 최고 기록으로 재면 스무 번 들어가 한 번 잘 나온 사람이 이긴다. */
export const MAX_ATTEMPTS = 2;

export type EscapeResult = {
  roomId: string;
  escaped: boolean;
  secondsLeft: number;
  hintsUsed: number;
  wrongCount: number;
};

export async function saveEscapeResult(userId: string, result: EscapeResult): Promise<void> {
  const { error } = await supabase.from('arena_escape_records').insert({
    user_id: userId,
    room_id: result.roomId,
    escaped: result.escaped,
    seconds_left: result.escaped ? result.secondsLeft : 0,
    hints_used: result.hintsUsed,
    wrong_count: result.wrongCount,
  });
  if (error) throw error;
}

export type Attempt = { secondsLeft: number; escaped: boolean };

export type RoomProgress = {
  roomId: string;
  /** 친 순서대로. 최대 두 판만 담는다. */
  attempts: Attempt[];
  /** 친 판들의 평균(반올림). 한 판만 쳤으면 그 점수. */
  average: number;
  /** 두 판을 다 썼는가 */
  finished: boolean;
  /** 한 번이라도 나온 적이 있는가 */
  everEscaped: boolean;
};

export function summarize(roomId: string, attempts: Attempt[]): RoomProgress {
  const first = attempts.slice(0, MAX_ATTEMPTS);
  const sum = first.reduce((n, a) => n + a.secondsLeft, 0);
  return {
    roomId,
    attempts: first,
    average: first.length ? Math.round(sum / first.length) : 0,
    finished: first.length >= MAX_ATTEMPTS,
    everEscaped: first.some((a) => a.escaped),
  };
}

/** 내 방별 진행. 방 목록 화면이 한 번에 다 쓰므로 한 번의 왕복으로 받는다. */
export async function getMyProgress(userId: string): Promise<Map<string, RoomProgress>> {
  const { data, error } = await supabase
    .from('arena_escape_records')
    .select('room_id, escaped, seconds_left, played_at')
    .eq('user_id', userId)
    // 「처음 두 판」을 골라야 하므로 친 순서가 중요하다
    .order('played_at', { ascending: true });
  if (error) throw error;

  const byRoom = new Map<string, Attempt[]>();
  for (const row of data ?? []) {
    const list = byRoom.get(row.room_id) ?? [];
    list.push({ secondsLeft: row.seconds_left as number, escaped: row.escaped as boolean });
    byRoom.set(row.room_id, list);
  }

  const out = new Map<string, RoomProgress>();
  for (const [roomId, attempts] of byRoom) out.set(roomId, summarize(roomId, attempts));
  return out;
}

/** 한 방의 내 진행만. 방에 들어가기 전에 몇 번째 판인지 알아야 한다. */
export async function getRoomProgress(userId: string, roomId: string): Promise<RoomProgress> {
  const { data, error } = await supabase
    .from('arena_escape_records')
    .select('escaped, seconds_left')
    .eq('user_id', userId)
    .eq('room_id', roomId)
    .order('played_at', { ascending: true });
  if (error) throw error;
  return summarize(
    roomId,
    (data ?? []).map((r) => ({ secondsLeft: r.seconds_left as number, escaped: r.escaped as boolean }))
  );
}

export type EscapeRankRow = {
  rank: number;
  display_name: string;
  seconds_left: number;
  is_me: boolean;
};

export async function getRoomRanking(roomId: string, topN = 5): Promise<EscapeRankRow[]> {
  const { data, error } = await supabase.rpc('arena_escape_ranking', {
    p_room_id: roomId,
    top_n: topN,
  });
  // 순위표는 없어도 게임은 되어야 한다. 함수가 아직 없거나(마이그레이션 전)
  // 실패해도 화면 전체를 막지 않는다.
  if (error) return [];
  return (data as EscapeRankRow[]) ?? [];
}

export type EscapeTotalRankRow = {
  rank: number;
  display_name: string;
  total: number;
  rooms_cleared: number;
  is_me: boolean;
};

export async function getTotalRanking(topN = 10): Promise<EscapeTotalRankRow[]> {
  const { data, error } = await supabase.rpc('arena_escape_total_ranking', { top_n: topN });
  if (error) return [];
  return (data as EscapeTotalRankRow[]) ?? [];
}
