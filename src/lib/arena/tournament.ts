import { supabase } from '@/lib/supabase';

/** 성경게임대전 토너먼트. → docs/arena/README.md
 *
 * 예선(기록전)으로 상위 N명을 뽑고 32강부터 결승까지 1:1 로 올라간다.
 * 경기는 비동기 — 짝지어진 둘이 같은 방을 각자 편할 때 풀고 점수를 견준다.
 *
 * 쓰기는 전부 DB 함수를 거친다. 승패를 화면에서 가리면 다투게 된다. */

export type Tournament = {
  id: string;
  name: string;
  status: 'draft' | 'qualifying' | 'bracket' | 'done';
  qualify_from: string;
  qualify_to: string;
  bracket_size: number;
  current_round: number | null;
  created_at: string;
  /** 본선에 오를 때 빠지는 포인트. 예선은 공짜다. */
  entry_fee: number;
  /** 교회가 상금에 보태는 포인트 */
  sponsor_points: number;
  /** 본선이 시작될 때 확정된 상금 총액. 시작 전에는 0 */
  prize_pool: number;
};

export type BracketMatch = {
  match_id: string;
  round: number;
  slot: number;
  room_id: string;
  name_a: string | null;
  name_b: string | null;
  score_a: number | null;
  score_b: number | null;
  played_a: boolean;
  played_b: boolean;
  winner_name: string | null;
  i_am_a: boolean;
  i_am_b: boolean;
  deadline: string | null;
};

/** 라운드는 「남은 인원」으로 적힌다. 사람이 읽는 말로 바꾼다. */
export function roundName(round: number): string {
  if (round === 2) return '결승';
  if (round === 4) return '준결승';
  return `${round}강`;
}

// 상금 셈은 prizeMath.ts 에 있다(검사 스크립트가 그 파일만 읽는다).
export { prizeTable, championTotal, type PrizeRow } from './prizeMath';

export async function listTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('arena_tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data as Tournament[]) ?? [];
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase.from('arena_tournaments').select('*').eq('id', id).maybeSingle();
  if (error) return null;
  return (data as Tournament) ?? null;
}

export async function getBracket(tournamentId: string): Promise<BracketMatch[]> {
  const { data, error } = await supabase.rpc('arena_tournament_bracket', {
    p_tournament_id: tournamentId,
  });
  if (error) return [];
  return (data as BracketMatch[]) ?? [];
}

/** 아직 안 끝난 내 경기. 없으면 null. */
export function findMyMatch(bracket: BracketMatch[], currentRound: number | null): BracketMatch | null {
  if (currentRound == null) return null;
  return (
    bracket.find(
      (m) =>
        m.round === currentRound &&
        (m.i_am_a || m.i_am_b) &&
        // 내가 아직 안 친 경기
        ((m.i_am_a && !m.played_a) || (m.i_am_b && !m.played_b))
    ) ?? null
  );
}

/** 이 라운드에서 내가 이미 친 경기(결과를 기다리는 중) */
export function findMyPlayedMatch(bracket: BracketMatch[], currentRound: number | null): BracketMatch | null {
  if (currentRound == null) return null;
  return (
    bracket.find(
      (m) => m.round === currentRound && ((m.i_am_a && m.played_a) || (m.i_am_b && m.played_b))
    ) ?? null
  );
}

export async function playMatch(
  matchId: string,
  escaped: boolean,
  secondsLeft: number,
  hints: number
): Promise<void> {
  const { error } = await supabase.rpc('arena_tournament_play', {
    p_match_id: matchId,
    p_escaped: escaped,
    p_seconds_left: secondsLeft,
    p_hints: hints,
  });
  if (error) throw error;
}

// ── 관리자 ────────────────────────────────────────────────────

export async function createTournament(
  name: string,
  from: string,
  to: string,
  size: number,
  entryFee: number,
  sponsor: number
): Promise<string> {
  const { data, error } = await supabase.rpc('arena_tournament_create', {
    p_name: name,
    p_from: from,
    p_to: to,
    p_size: size,
    p_entry_fee: entryFee,
    p_sponsor: sponsor,
  });
  if (error) throw error;
  return data as string;
}

export async function startBracket(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc('arena_tournament_start_bracket', {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
}

export async function closeRound(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc('arena_tournament_close_round', {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
}

export type Entrant = { user_id: string; seed: number; qualify_score: number };

export type PointHistoryRow = {
  amount: number;
  reason: 'entry_fee' | 'prize';
  tournament_name: string | null;
  round: number | null;
  created_at: string;
};

/** 내 대회 포인트 내역 — 참가비로 나간 것과 상금으로 들어온 것 */
export async function getMyPointHistory(): Promise<PointHistoryRow[]> {
  const { data, error } = await supabase.rpc('arena_my_point_history');
  if (error) return [];
  return (data as PointHistoryRow[]) ?? [];
}

export async function getEntrants(tournamentId: string): Promise<Entrant[]> {
  const { data, error } = await supabase
    .from('arena_tournament_entrants')
    .select('user_id, seed, qualify_score')
    .eq('tournament_id', tournamentId)
    .order('seed');
  if (error) return [];
  return (data as Entrant[]) ?? [];
}

/**
 * 잘못 만든 대회를 지운다.
 *
 * **비어 있는 대회만 지워진다.** 참가비·상금이 오갔거나, 치른 경기가 있거나,
 * 예선 통과자가 있으면 DB 가 거절한다(0069). 지우게 두면 arena_point_ledger 가
 * 함께 딸려 지워져 성도들이 낸 참가비가 기록째 사라지기 때문이다.
 */
export async function deleteTournament(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc('arena_delete_tournament', {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
}
