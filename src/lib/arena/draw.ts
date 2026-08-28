import type { DrawnLocks, EscapeRoom } from './escapeTypes';

/** 방의 자물쇠 후보에서 이번 판에 쓸 넷을 뽑는다. → docs/arena/README.md
 *
 * ## 왜 씨앗(seed)으로 뽑는가
 *
 * 그냥 `Math.random()` 을 쓰면 **겨루는 두 사람이 서로 다른 문제를 본다.** 같은
 * 방에 들어갔는데 문제가 다르면 겨루기가 아니다. 씨앗을 주면 같은 씨앗에서
 * 언제나 같은 넷이 나오므로, 둘에게 같은 씨앗(대결 번호·경기 번호에서 만든
 * 것)을 주면 같은 문제를 본다.
 *
 * 혼자 칠 때는 씨앗을 매번 새로 만든다 — 두 판을 쳐도 서로 다른 문제가 나온다.
 */

/** 작고 빠른 난수기. 같은 씨앗이면 언제나 같은 차례를 내놓는다. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 글자열을 씨앗 숫자로. 대결 번호·경기 번호를 그대로 넣는다. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 혼자 칠 때 쓰는 씨앗. 판마다 새로 만든다. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 이번 판의 자물쇠 넷.
 *
 * 후보가 셋보다 적으면 있는 대로 쓰고 모자란 자리는 앞의 것을 다시 쓴다 —
 * 방을 새로 만드는 도중에 화면이 죽지 않게 하기 위한 것이고, 정상적인 방은
 * `check-arena-rooms.mjs` 가 후보 수를 검사한다.
 */
export function drawLocks(room: EscapeRoom, seed: number): DrawnLocks {
  const rnd = mulberry32(seed);
  const pool = shuffled(room.lockPool, rnd);
  const picked = [pool[0], pool[1] ?? pool[0], pool[2] ?? pool[0]];
  const final = room.finalPool[Math.floor(rnd() * room.finalPool.length)] ?? room.finalPool[0];
  return { locks: [picked[0], picked[1], picked[2]], final };
}
