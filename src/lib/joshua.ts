import { supabase } from '@/lib/supabase';

/** 여호수아의 전쟁 — 둘이 하는 아케이드. → docs/arcade/README.md
 *
 * 방 만들기·번호로 들어가기·진행 알리기는 0091 마이그레이션의 DB 함수를 거친다.
 * 구조는 방탈출 겨루기(lib/arena/duel.ts)와 같다. */

export const POLL_MS = 2000;

/** 둘 다 준비한 뒤 이만큼 세고 시작한다(폴링 간격보다 길어야 한다). */
export const COUNTDOWN_MS = 3000;

/** 둘의 점수를 더해 이 값을 넘기면 함께 이긴 것으로 친다(800점 만점 중). */
export const ALLIANCE_GOAL = 520;

export type JoshuaState = {
  id: string;
  code: string;
  status: 'waiting' | 'playing' | 'done';
  i_am_host: boolean;
  started_at: string | null;
  my_stage: number;
  opponent_stage: number;
  my_score: number;
  opponent_score: number;
  opponent_name: string | null;
  opponent_joined: boolean;
  i_am_ready: boolean;
  opponent_ready: boolean;
  my_done: boolean;
  opponent_done: boolean;
};

export async function createRoom(): Promise<string> {
  const { data, error } = await supabase.rpc('joshua_create');
  if (error) throw error;
  return data as string;
}

export async function joinRoom(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('joshua_join', { p_code: code });
  if (error) throw error;
  return data as string;
}

export async function readyRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('joshua_ready', { p_room_id: roomId });
  if (error) throw error;
}

export async function progressRoom(roomId: string, stage: number, score: number): Promise<void> {
  // 진행 알림이 실패해도 내 싸움은 멈추지 않는다. 승부는 finish 로 가린다.
  await supabase.rpc('joshua_progress', { p_room_id: roomId, p_stage: stage, p_score: score });
}

export async function finishRoom(roomId: string, score: number): Promise<void> {
  const { error } = await supabase.rpc('joshua_finish', { p_room_id: roomId, p_score: score });
  if (error) throw error;
}

export async function getRoomState(roomId: string): Promise<JoshuaState | null> {
  const { data, error } = await supabase.rpc('joshua_state', { p_room_id: roomId });
  if (error) return null;
  const rows = data as JoshuaState[] | null;
  return rows && rows.length ? rows[0] : null;
}

/** 작고 빠른 난수기. 같은 씨앗이면 언제나 같은 차례 — 둘이 같은 판을 본다. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type War = {
  id: 'jericho' | 'ai' | 'gibeon' | 'kings';
  emoji: string;
  title: string;
  passage: string;
  verse: string;
  how: string;
};

/** 네 전쟁. 한 전쟁은 안내 3초 + 싸움 24초. */
export const WARS: War[] = [
  {
    id: 'jericho',
    emoji: '🎺',
    title: '여리고 성',
    passage: '수 6',
    verse: '백성이 큰 소리로 외치니 성벽이 무너져 내리더라',
    how: '움직이는 막대가 초록 칸에 올 때 「행진」을 누르세요. 일곱 번째는 함성 — 점수가 두 배!',
  },
  {
    id: 'ai',
    emoji: '🔥',
    title: '아이 성 매복',
    passage: '수 8',
    verse: '매복한 자들이 급히 일어나 성을 점령하고',
    how: '깃발 신호가 깜박이는 차례를 외웠다가 그대로 눌러 따라 하세요. 갈수록 길어집니다.',
  },
  {
    id: 'gibeon',
    emoji: '☀️',
    title: '기브온 — 해야 멈추어라',
    passage: '수 10:12-14',
    verse: '태양이 하늘 가운데 머물러 종일토록 속히 내려가지 아니하였더라',
    how: '해가 자꾸 내려갑니다. 「기도」를 눌러 해를 초록 띠 안에 머물게 하세요.',
  },
  {
    id: 'kings',
    emoji: '👑',
    title: '막게다 굴의 다섯 왕',
    passage: '수 10:16-27',
    verse: '다섯 왕이 도망하여 막게다 굴에 숨은지라',
    how: '굴에서 얼굴이 나옵니다. 👑 왕만 눌러 잡으세요. 우리 백성(🙂)을 누르면 감점!',
  },
];

export const INTRO_MS = 3000;
export const WAR_MS = 24000;
export const WAR_SLOT_MS = INTRO_MS + WAR_MS;
export const TOTAL_MS = WAR_SLOT_MS * WARS.length;
export const MAX_SCORE = 100 * WARS.length;
