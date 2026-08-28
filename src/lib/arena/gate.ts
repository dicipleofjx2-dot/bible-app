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

/** 물어볼 수 없을 때는 **닫힌 것으로 본다.**
 *
 * 처음에는 반대로 두었다 — 마이그레이션을 안 돌린 사이에 아무도 못 들어오면
 * 안 된다고 보았다. 그런데 2026-08-29 에 Supabase 프로젝트가 전송량 한도로
 * 정지되자 이 함수가 실패했고, **잠가 둔 문이 도로 열려 문제가 다시 노출됐다.**
 *
 * 문을 닫는 것이 이 기능의 목적이므로 모르면 닫는 쪽이 맞다. DB 가 죽어 있으면
 * 어차피 기록도 안 남아 게임이 성립하지 않는다 — 열어 둘 이득이 없다. */
const CLOSED_WHEN_UNKNOWN: GateState = {
  is_open: false,
  opened_by_admin: false,
  closed_message: '지금은 들어갈 수 없습니다. 잠시 후 다시 시도해 주세요.',
  next_open_from: null,
  next_open_to: null,
  next_tournament: null,
};

export async function getGateState(): Promise<GateState> {
  const { data, error } = await supabase.rpc('arena_gate_state');
  if (error) return CLOSED_WHEN_UNKNOWN;
  const rows = data as GateState[] | null;
  // 빈 결과도 「모른다」다 — 같은 이유로 닫는다.
  return rows?.[0] ?? CLOSED_WHEN_UNKNOWN;
}

export async function setRoomsOpen(open: boolean, message?: string): Promise<void> {
  const { error } = await supabase.rpc('arena_set_rooms_open', {
    p_open: open,
    p_message: message ?? null,
  });
  if (error) throw error;
}
