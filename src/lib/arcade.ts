import { supabase } from '@/lib/supabase';

/**
 * 창세기 아케이드 포인트. → docs/arcade/README.md
 *
 * 게임 자체는 `public/genesis-arcade.html` 한 장에 다 들어 있다(캔버스로 그리는
 * 다섯 판). 이 파일은 그 판이 「끝까지 통과했다」고 알려 올 때 통독 포인트를
 * 넣어 주는 일만 한다.
 *
 * 판정을 서버에서 다시 검사할 방법은 없다 — 캔버스 안에서 벌어진 일이라
 * 재현할 기록이 없기 때문이다. 대신 **같은 판은 하루 한 번만** 준다(0075).
 * 그러면 최대한 속여도 그날 몫을 미리 받는 것뿐이라 순위표가 흔들리지 않는다.
 */

export const ARCADE_GAMES = ['ark', 'babel', 'sodom', 'jabbok', 'granary'] as const;
export type ArcadeGame = (typeof ARCADE_GAMES)[number];

export function isArcadeGame(v: unknown): v is ArcadeGame {
  return typeof v === 'string' && (ARCADE_GAMES as readonly string[]).includes(v);
}

export type AwardResult = {
  awarded: boolean;
  points: number;
  todayPoints: number;
  reason: 'ok' | 'already_today' | 'daily_cap' | 'not_signed_in' | 'unknown_game' | 'error';
};

export type ArcadeState = {
  todayGames: ArcadeGame[];
  todayPoints: number;
  totalPoints: number;
};

const EMPTY: ArcadeState = { todayGames: [], todayPoints: 0, totalPoints: 0 };

/** 한 판을 통과했다 — 포인트를 넣는다. */
export async function awardClear(game: ArcadeGame): Promise<AwardResult> {
  const { data, error } = await supabase.rpc('arcade_award', { p_game: game });
  if (error || !data) return { awarded: false, points: 0, todayPoints: 0, reason: 'error' };
  const row = (Array.isArray(data) ? data[0] : data) as {
    awarded?: boolean;
    points?: number;
    today_points?: number;
    reason?: AwardResult['reason'];
  } | null;
  if (!row) return { awarded: false, points: 0, todayPoints: 0, reason: 'error' };
  return {
    awarded: !!row.awarded,
    points: Number(row.points ?? 0),
    todayPoints: Number(row.today_points ?? 0),
    reason: row.reason ?? 'error',
  };
}

/** 오늘 어느 판을 이미 깼는지 — 게임 화면이 미리 표시하는 데 쓴다. */
export async function getArcadeState(): Promise<ArcadeState> {
  const { data, error } = await supabase.rpc('arcade_my_state');
  if (error || !data) return EMPTY;
  const row = (Array.isArray(data) ? data[0] : data) as {
    today_games?: string[] | null;
    today_points?: number;
    total_points?: number;
  } | null;
  if (!row) return EMPTY;
  return {
    todayGames: (row.today_games ?? []).filter(isArcadeGame),
    todayPoints: Number(row.today_points ?? 0),
    totalPoints: Number(row.total_points ?? 0),
  };
}

/**
 * 게임 판이 열리는 주소.
 *
 * `public/` 에 둔 파일은 확장자 없는 주소로 열린다(vercel.json 의 cleanUrls).
 * 다만 **개발 서버에서는 확장자를 붙여야** 나온다 — support.tsx 의 /coupang 과
 * 같은 사정이다. 배포본에서 `/genesis-arcade.html` 로 열면 확장자 없는 주소로
 * 한 번 넘겨보내지므로(리다이렉트) 어느 쪽이든 열리기는 한다. 그래서 웹에서는
 * 지금 열려 있는 곳을 기준으로 붙이고, 앱(네이티브)에서는 배포 주소를 쓴다.
 */
export const ARCADE_SITE = 'https://dicipleofjx-bible.vercel.app';

export function arcadeUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/genesis-arcade.html`;
  }
  return `${ARCADE_SITE}/genesis-arcade.html`;
}
