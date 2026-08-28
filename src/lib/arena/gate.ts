import { supabase } from '@/lib/supabase';

/** 방탈출 문 여닫기. → docs/arena/README.md
 *
 * 대회를 시작하기도 전에 사람들이 들어와 문제를 다 풀어 버렸다. 미리 본 사람이
 * 유리해지면 대회가 대회가 아니다. 그래서 평소에는 잠가 두고 예선이 시작되면
 * 열린다(관리자는 확인해야 하므로 언제나 들어갈 수 있다). */

export type GateState = {
  is_open: boolean;
  /** 관리자가 손으로 열어 둔 상태인가 */
  opened_by_admin: boolean;
  closed_message: string | null;
  next_open_from: string | null;
  next_open_to: string | null;
  next_tournament: string | null;
};

/** 문이 닫혔을 때 기본으로 띄우는 말 */
export const DEFAULT_CLOSED_MESSAGE =
  '아직 문이 열리지 않았습니다. 대회 예선이 시작되면 함께 열립니다.';

export async function getGateState(): Promise<GateState> {
  const { data, error } = await supabase.rpc('arena_gate_state');
  // 함수가 아직 없거나(마이그레이션 전) 실패하면 **열린 것으로 본다.**
  // 여기서 닫아 버리면 마이그레이션을 안 돌린 사이에 아무도 못 들어온다.
  if (error) {
    return {
      is_open: true,
      opened_by_admin: false,
      closed_message: null,
      next_open_from: null,
      next_open_to: null,
      next_tournament: null,
    };
  }
  const rows = data as GateState[] | null;
  return (
    rows?.[0] ?? {
      is_open: true,
      opened_by_admin: false,
      closed_message: null,
      next_open_from: null,
      next_open_to: null,
      next_tournament: null,
    }
  );
}

export async function setRoomsOpen(open: boolean, message?: string): Promise<void> {
  const { error } = await supabase.rpc('arena_set_rooms_open', {
    p_open: open,
    p_message: message ?? null,
  });
  if (error) throw error;
}
