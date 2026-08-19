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

/* ────────────────────────────────────────────────────────────────────────
 * 자리 내주기 — 나중에 연 탭이 이긴다.
 *
 * 예전에는 두 번째 탭에 "먼저 연 탭을 닫으세요"라고 안내만 했다. 맞는 말이긴
 * 한데, 사용자가 실제로 하려던 일은 **지금 보고 있는 탭에서 앱을 쓰는 것**이다.
 * 홈페이지에서 링크를 눌러 새 탭이 앞으로 나온 상황이라면 더욱 그렇다 —
 * 뒤에 숨어 있는 탭을 찾아 닫으라는 건 사용자에게 일을 시키는 것이다.
 *
 * 그래서 뒤집는다. 새 탭이 "내가 쓸게요"라고 알리면, 잠금을 쥐고 있던 탭이
 * 스스로 물러나 잠금을 놓는다. 물러난 탭은 빈 화면이 아니라 "여기서 다시 열기"
 * 단추를 보여 준다 — 되돌아갈 길은 남겨 둔다.
 *
 * 물러나는 방법은 새로고침이다. expo-sqlite 웹 백엔드는 열린 DB를 밖에서
 * 닫을 길을 주지 않는다(Worker와 핸들이 모듈 수준에 숨어 있다). 탭을 다시
 * 읽으면 브라우저가 그 Worker를 통째로 버리므로 핸들이 확실히 풀린다.
 * ──────────────────────────────────────────────────────────────────────── */

const CHANNEL_NAME = 'davidbible-tabs';
/** 물러난 상태는 그 탭에만, 그 세션에만 남는다. 새로 연 탭에는 옮겨붙지 않는다. */
const YIELDED_KEY = 'davidbible.yielded';

function channel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/** 이 탭이 자리를 내주고 물러난 상태인가. */
export function hasYielded(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(YIELDED_KEY) === '1';
}

/** "여기서 다시 열기"를 누르면 물러남을 취소하고 다시 잡으러 간다. */
export function reclaimHere() {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(YIELDED_KEY);
  claimDb();
  if (typeof window !== 'undefined') window.location.reload();
}

/** 다른 탭에게 "이제 내가 쓴다"고 알린다. */
export function claimDb() {
  const bus = channel();
  if (!bus) return;
  try {
    bus.postMessage({ type: 'claim' });
  } finally {
    bus.close();
  }
}

/**
 * DB를 쥔 탭이 부른다. 다른 탭이 자리를 달라고 하면 물러난다.
 *
 * 물러난 표시를 먼저 남기고 새로고침한다. 그래야 다시 뜬 뒤에 DB를 또 잡으려
 * 들지 않는다 — 안 그러면 두 탭이 서로 뺏느라 새로고침만 반복한다.
 */
export function yieldDbOnClaim(): () => void {
  const bus = channel();
  if (!bus) return () => {};

  bus.onmessage = (event: MessageEvent) => {
    if ((event.data as { type?: string })?.type !== 'claim') return;
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(YIELDED_KEY, '1');
    if (typeof window !== 'undefined') window.location.reload();
  };

  return () => bus.close();
}
