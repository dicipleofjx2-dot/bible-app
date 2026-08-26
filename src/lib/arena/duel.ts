import { supabase } from '@/lib/supabase';

/** 둘이 같은 방에 들어가 겨루는 대결. → docs/arena/README.md
 *
 * 쓰기는 전부 DB 함수를 거친다. 표를 직접 고치게 두면 상대 칸도 고칠 수 있고,
 * 이건 상금이 걸린 대결이다(0061 마이그레이션 머리말 참조). */

/** 화면이 상태를 다시 물어보는 간격. Realtime 을 안 쓰는 이유는 0061 에 적었다. */
export const POLL_MS = 2000;

export type DuelState = {
  id: string;
  room_id: string;
  code: string;
  status: 'waiting' | 'playing' | 'done';
  i_am_host: boolean;
  started_at: string | null;
  my_step: number;
  opponent_step: number;
  opponent_name: string | null;
  opponent_joined: boolean;
  i_am_ready: boolean;
  opponent_ready: boolean;
  my_escaped: boolean | null;
  my_seconds_left: number | null;
  opponent_escaped: boolean | null;
  opponent_seconds_left: number | null;
};

export async function createDuel(roomId: string): Promise<string> {
  const { data, error } = await supabase.rpc('arena_duel_create', { p_room_id: roomId });
  if (error) throw error;
  return data as string;
}

export async function joinDuel(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('arena_duel_join', { p_code: code });
  if (error) throw error;
  return data as string;
}

export async function readyDuel(duelId: string): Promise<void> {
  const { error } = await supabase.rpc('arena_duel_ready', { p_duel_id: duelId });
  if (error) throw error;
}

export async function stepDuel(duelId: string, step: number): Promise<void> {
  // 진행 알림이 실패해도 내 놀이는 멈추지 않아야 한다 — 상대 화면에 잠깐 늦게
  // 보일 뿐이고, 승부는 finish 로 가린다.
  await supabase.rpc('arena_duel_step', { p_duel_id: duelId, p_step: step });
}

export async function finishDuel(duelId: string, escaped: boolean, secondsLeft: number): Promise<void> {
  const { error } = await supabase.rpc('arena_duel_finish', {
    p_duel_id: duelId,
    p_escaped: escaped,
    p_seconds_left: secondsLeft,
  });
  if (error) throw error;
}

export async function getDuelState(duelId: string): Promise<DuelState | null> {
  const { data, error } = await supabase.rpc('arena_duel_state', { p_duel_id: duelId });
  if (error) return null;
  const rows = data as DuelState[] | null;
  return rows && rows.length ? rows[0] : null;
}

export type Verdict = 'win' | 'lose' | 'draw' | 'waiting';

/** 승부를 가린다.
 *
 * 1. 나온 사람이 못 나온 사람을 이긴다.
 * 2. 둘 다 나왔으면 시간을 더 남긴 쪽이 이긴다.
 * 3. 둘 다 못 나왔으면 자물쇠를 더 많이 연 쪽이 이긴다.
 * 4. 그것도 같으면 비긴다.
 *
 * 3번이 있는 이유 — 둘 다 실패했을 때 그냥 무승부로 두면, 어차피 못 나올 것
 * 같은 사람이 남은 시간을 흘려보내게 된다. 끝까지 한 자물쇠라도 더 여는 편이
 * 낫게 만들어야 마지막까지 붙는다. */
export function judge(s: DuelState): Verdict {
  if (s.my_escaped == null || s.opponent_escaped == null) return 'waiting';

  if (s.my_escaped && !s.opponent_escaped) return 'win';
  if (!s.my_escaped && s.opponent_escaped) return 'lose';

  if (s.my_escaped && s.opponent_escaped) {
    const mine = s.my_seconds_left ?? 0;
    const theirs = s.opponent_seconds_left ?? 0;
    if (mine > theirs) return 'win';
    if (mine < theirs) return 'lose';
    return 'draw';
  }

  if (s.my_step > s.opponent_step) return 'win';
  if (s.my_step < s.opponent_step) return 'lose';
  return 'draw';
}

/** 상대가 어디까지 갔는지 한 줄로 */
export function stepLabel(step: number): string {
  if (step >= 4) return '탈출!';
  if (step === 3) return '마지막 문';
  return `자물쇠 ${step + 1} / 3`;
}
