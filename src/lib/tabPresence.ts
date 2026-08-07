/**
 * 웹에서 이 앱은 브라우저 저장소(OPFS)를 한 탭만 잡을 수 있다. 같은 브라우저에서
 * 두 번째 탭을 열면 그 탭은 DB를 못 열고 곧장 에러로 떨어진다.
 *
 * 그 상황인지 아닌지를 알아야 사용자에게 맞는 말을 해줄 수 있다 — 다른 탭이
 * 있으면 "그 탭을 닫으세요"가 답이고, 없으면 저장소가 실제로 망가진 것이라
 * 정리가 답이다. 둘을 구분하지 못해 늘 "저장소를 정리하라"고 안내하고 있었고,
 * 그건 멀쩡한 데이터를 지우라는 잘못된 처방이었다.
 *
 * BroadcastChannel로 같은 출처의 다른 탭에 신호를 보내 살아 있는지 물어본다.
 * 네이티브(iOS·안드로이드)에는 BroadcastChannel이 없고 탭 개념도 없으므로
 * 전부 "다른 탭 없음"으로 동작한다.
 */
const CHANNEL_NAME = 'davidbible-tabs';
const PING = 'ping';
const PONG = 'pong';
const BYE = 'bye';

type Channel = { postMessage(m: string): void; close(): void; onmessage: ((e: { data: string }) => void) | null };

function openChannel(): Channel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME) as unknown as Channel;
  } catch {
    return null;
  }
}

let selfChannel: Channel | null = null;

/** 앱이 뜨면 한 번 호출한다. 다른 탭이 물어오면 "나 여기 있다"고 답한다. */
export function announcePresence() {
  if (selfChannel) return;
  selfChannel = openChannel();
  if (!selfChannel) return;

  selfChannel.onmessage = (event) => {
    if (event.data === PING) selfChannel?.postMessage(PONG);
  };

  if (typeof window !== 'undefined') {
    // 탭이 닫히면 알려 준다 — 기다리던 탭이 곧바로 다시 시도할 수 있게.
    window.addEventListener('pagehide', () => selfChannel?.postMessage(BYE));
  }
}

/** 같은 앱을 띄운 다른 탭이 살아 있는지. 답이 없으면 없는 것으로 본다. */
export function hasOtherTab(timeoutMs = 400): Promise<boolean> {
  const channel = openChannel();
  if (!channel) return Promise.resolve(false);

  return new Promise((resolve) => {
    let done = false;
    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      channel.close();
      resolve(value);
    };
    channel.onmessage = (event) => {
      if (event.data === PONG) finish(true);
    };
    channel.postMessage(PING);
    setTimeout(() => finish(false), timeoutMs);
  });
}

/** 다른 탭이 닫히면 알려 준다. 정리 함수를 돌려준다. */
export function onOtherTabClosed(callback: () => void): () => void {
  const channel = openChannel();
  if (!channel) return () => {};
  channel.onmessage = (event) => {
    if (event.data === BYE) callback();
  };
  return () => channel.close();
}
