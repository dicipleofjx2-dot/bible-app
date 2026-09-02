import { awardClear, getArcadeState, isArcadeGame, type ArcadeState } from '@/lib/arcade';

/**
 * 게임 판(genesis-arcade.html)과 앱 사이에 오가는 말.
 *
 * 웹에서는 iframe 의 postMessage 로, 앱에서는 WebView 의 onMessage 와
 * injectJavaScript 로 오간다. **오가는 내용은 두 쪽이 똑같아야** 하므로 여기
 * 한 곳에만 적는다.
 *
 * 게임 판은 남이 만든 페이지가 아니라 우리가 public/ 에 둔 파일이지만, 그래도
 * 들어오는 말은 그대로 믿지 않는다 — 게임 이름은 아는 다섯 개인지 확인하고
 * 넘긴다(포인트를 넣는 자리라서).
 */

export type PageMessage =
  | { source: 'genesis-arcade'; type: 'ready' }
  | { source: 'genesis-arcade'; type: 'clear'; game: string; id: number };

export type HostMessage =
  | ({ source: 'genesis-arcade-host'; type: 'state'; signedIn: boolean } & ArcadeState)
  | {
      source: 'genesis-arcade-host';
      type: 'result';
      id: number;
      awarded: boolean;
      points: number;
      todayPoints: number;
      reason: string;
      state: ({ signedIn: boolean } & ArcadeState) | null;
    };

export function isPageMessage(v: unknown): v is PageMessage {
  if (!v || typeof v !== 'object') return false;
  const m = v as { source?: unknown; type?: unknown };
  return m.source === 'genesis-arcade' && (m.type === 'ready' || m.type === 'clear');
}

/**
 * 게임 판이 한 말에 답한다.
 *
 * 로그인을 안 했으면 서버에 묻지 않는다 — 어차피 not_signed_in 이 돌아오고,
 * 로그인 안 한 사람이 판을 깰 때마다 서버를 두드릴 이유가 없다.
 */
export async function replyTo(
  msg: PageMessage,
  signedIn: boolean,
  onState?: (s: ArcadeState) => void,
): Promise<HostMessage | null> {
  if (msg.type === 'ready') {
    const state = signedIn ? await getArcadeState() : { todayGames: [], todayPoints: 0, totalPoints: 0 };
    onState?.(state);
    return { source: 'genesis-arcade-host', type: 'state', signedIn, ...state };
  }

  if (!signedIn) {
    return {
      source: 'genesis-arcade-host',
      type: 'result',
      id: msg.id,
      awarded: false,
      points: 0,
      todayPoints: 0,
      reason: 'not_signed_in',
      state: null,
    };
  }
  if (!isArcadeGame(msg.game)) return null;

  const r = await awardClear(msg.game);
  const state = await getArcadeState();
  onState?.(state);
  return {
    source: 'genesis-arcade-host',
    type: 'result',
    id: msg.id,
    awarded: r.awarded,
    points: r.points,
    todayPoints: r.todayPoints,
    reason: r.reason,
    state: { signedIn: true, ...state },
  };
}
