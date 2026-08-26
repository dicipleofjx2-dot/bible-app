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
  size: number
): Promise<string> {
  const { data, error } = await supabase.rpc('arena_tournament_create', {
    p_name: name,
    p_from: from,
    p_to: to,
    p_size: size,
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

export async function getEntrants(tournamentId: string): Promise<Entrant[]> {
  const { data, error } = await supabase
    .from('arena_tournament_entrants')
    .select('user_id, seed, qualify_score')
    .eq('tournament_id', tournamentId)
    .order('seed');
  if (error) return [];
  return (data as Entrant[]) ?? [];
}
