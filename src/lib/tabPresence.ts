/**
 * 웹에서 이 앱은 브라우저 저장소(OPFS)를 한 탭만 잡을 수 있다. 같은 브라우저에서
 * 두 번째 탭을 열면 그 탭은 DB를 못 열고 곧장 에러로 떨어진다.
 *
 * 그 상황인지 아닌지를 알아야 사용자에게 맞는 말을 해줄 수 있다 — 다른 탭이
 * 있으면 "그 탭을 닫으세요"가 답이고, 없으면 저장소가 실제로 망가진 것이라
 * 정리가 답이다.
 *
 * 처음에는 BroadcastChannel로 "거기 누구 있냐"고 물어봤는데, 배경으로 내려간
 * 탭은 메시지 처리를 미뤄서 답이 제때 오지 않았다. 링크를 눌러 새 탭이 앞으로
 * 나오는 상황이 딱 그 경우라, 정작 필요한 순간에 못 알아챘다.
 *
 * 그래서 Web Locks로 바꿨다. 메시지를 주고받을 필요 없이 잠금이 잡혀 있는지
 * 물어보기만 하면 되고, 탭이 닫히면 브라우저가 알아서 풀어 준다. 기다리는 쪽은
 * 같은 잠금을 요청해 두면 풀리는 순간 깨어난다 — 폴링도 필요 없다.
 *
 * 잠금은 **DB를 실제로 연 탭만** 잡는다(AppDbLock 참고). 에러로 떨어진 탭까지
 * 잡으면 서로 자기가 주인인 줄 알게 된다.
 */
const LOCK_NAME = 'davidbible-db';

type LockManager = {
  request(name: string, options: { mode?: string; signal?: AbortSignal }, cb: () => Promise<void>): Promise<void>;
  query(): Promise<{ held: { name?: string }[] }>;
};

function locks(): LockManager | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as unknown as { locks?: LockManager }).locks ?? null;
}

/**
 * DB를 연 탭이 부르는 함수. 탭이 살아 있는 동안 잠금을 쥐고 있다가, 탭이 닫히면
 * 브라우저가 자동으로 놓는다. 그래서 일부러 끝나지 않는 약속을 돌려준다.
 */
export function holdDbLock() {
  const manager = locks();
  if (!manager) return;
  manager.request(LOCK_NAME, { mode: 'exclusive' }, () => new Promise<void>(() => {})).catch(() => {
    // 이미 다른 탭이 쥐고 있으면 그냥 기다리는 상태가 된다 — 문제될 게 없다.
  });
}

/** 같은 앱을 띄운 다른 탭이 DB를 쥐고 있는지. */
export async function hasOtherTab(): Promise<boolean> {
  const manager = locks();
  if (!manager) return false;
  try {
    const state = await manager.query();
    return state.held.some((lock) => lock.name === LOCK_NAME);
  } catch {
    return false;
  }
}

/**
 * 다른 탭이 잠금을 놓으면(=탭이 닫히면) 알려 준다.
 * 같은 잠금을 요청해 줄을 서 두면 차례가 오는 순간 콜백이 불린다.
 * 정리 함수를 돌려주므로 화면이 사라질 때 요청을 취소할 수 있다.
 */
export function onDbLockReleased(callback: () => void): () => void {
  const manager = locks();
  if (!manager) return () => {};
  const controller = new AbortController();
  manager
    .request(LOCK_NAME, { mode: 'exclusive', signal: controller.signal }, async () => {
      callback();
    })
    .catch(() => {
      // 취소(abort)되면 여기로 온다 — 무시한다.
    });
  return () => controller.abort();
}
