/**
 * 나무의 뼈대를 만든다 — 손으로 그린 타원 몇 개 대신, 줄기에서 갈라져 나가는
 * 가지를 재귀로 뻗어 실제 나무의 결을 만든다.
 *
 * 씨앗 42 를 쓴다 — 열 몇 개를 그려 보고 왕관이 가장 둥글고(가로:세로 2.3)
 * 열매 놓을 가지 끝이 가장 많이(10곳) 나온 것을 골랐다.
 *
 * **난수를 쓰되 씨앗을 고정한다.** 그릴 때마다 모양이 달라지면 열매를 놓아 둔
 * 자리가 매번 다른 가지 위에 뜬다. 같은 씨앗은 언제나 같은 나무다.
 *
 * **가지는 다섯 대까지만 갈라진다.** react-native-svg 는 도형 하나를 네이티브
 * 뷰 하나로 그리므로, 여섯 대까지 뻗으면 잎이 삼천 개가 되어 폰에서 화면이
 * 버벅인다(처음에 그렇게 만들었다). 다섯 대면 500개 안팎이다.
 *
 * 좌표는 viewBox 0..100(가로) × 0..112(세로) 안의 값이다. 가지가 어디까지
 * 뻗을지는 난수가 정하므로, 다 자란 뒤에 **한 번 재서 화면에 맞춰 넣는다** —
 * 그래야 어떤 씨앗을 써도 잎이 화면 밖으로 잘리지 않는다.
 */

export type Branch = { d: string; width: number; depth: number };
export type Leaf = { cx: number; cy: number; r: number; tone: number };

export type TreeShape = {
  branches: Branch[];
  /** 잎 덩어리 — 어두운 것부터 그린다(tone 이 클수록 밝다) */
  leaves: Leaf[];
  /** 열매를 놓기 좋은 자리(가지 끝). 0~1 비율 */
  fruitSpots: { x: number; y: number }[];
  /** 줄기 밑동 — 그림자와 땅을 여기에 맞춘다. 0..100 / 0..112 좌표 */
  base: { x: number; y: number };
};

/** 씨앗 하나로 같은 수열을 내는 작은 난수기(mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VIEW_W = 100;
const VIEW_H = 112;
/** 나무가 들어갈 자리. 위·옆에 여백을 남겨 열매와 이름표가 잘리지 않게 한다. */
const FIT = { left: 7, right: 93, top: 7, bottom: 99 };

type RawBranch = {
  x1: number; y1: number; cx: number; cy: number; x2: number; y2: number;
  width: number; depth: number;
};

/**
 * 나무 한 그루.
 *
 * 가지는 갈라질수록 짧고 가늘어지고, 갈라지면서도 **위로 되돌아온다**(각도를
 * 매번 위쪽으로 조금 당긴다). 이 되돌림이 없으면 가지가 옆으로만 퍼져 나무가
 * 아니라 울타리처럼 보인다 — 처음 그린 것이 그랬다.
 */
export function buildTree(seed = 42): TreeShape {
  const rand = rng(seed);
  const raw: RawBranch[] = [];
  const rawLeaves: Leaf[] = [];
  const tips: { x: number; y: number; depth: number }[] = [];

  const UP = -Math.PI / 2;

  function grow(x: number, y: number, angle: number, length: number, width: number, depth: number) {
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    // 휘어짐 — 가지 중간을 진행 방향의 옆으로 조금 민다. 곧은 선분으로 이으면
    // 전봇대가 된다.
    const bow = (rand() - 0.5) * length * 0.4;
    const cx = (x + endX) / 2 + Math.cos(angle + Math.PI / 2) * bow;
    const cy = (y + endY) / 2 + Math.sin(angle + Math.PI / 2) * bow;

    raw.push({ x1: x, y1: y, cx, cy, x2: endX, y2: endY, width, depth });

    if (depth >= 5 || length < 2.4) {
      tips.push({ x: endX, y: endY, depth });
      // 가지 끝의 잎 덩어리. 큰 것 하나에 작은 것 몇을 흩뿌린다 — 크기가 고르면
      // 브로콜리처럼 보인다.
      rawLeaves.push({ cx: endX, cy: endY, r: 6.5 + rand() * 4, tone: 0.35 + rand() * 0.65 });
      const extras = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < extras; i += 1) {
        rawLeaves.push({
          cx: endX + (rand() - 0.5) * 11,
          cy: endY + (rand() - 0.5) * 10,
          r: 3 + rand() * 3.6,
          tone: rand(),
        });
      }
      return;
    }

    // 끝가지만 잎을 달면 왕관이 껍데기처럼 얇아진다. 안쪽 가지에도 조금 얹어
    // 속을 채운다(어두운 색이라 그늘처럼 보인다).
    if (depth >= 3) {
      rawLeaves.push({ cx: endX, cy: endY, r: 4 + rand() * 3.4, tone: rand() * 0.5 });
    }

    const children = depth === 0 ? 3 : rand() < 0.3 ? 3 : 2;
    for (let i = 0; i < children; i += 1) {
      const spread = 0.34 + rand() * 0.3;
      const dir = children === 2 ? (i === 0 ? -1 : 1) : i - 1;
      let next = angle + dir * spread + (rand() - 0.5) * 0.16;
      // 위로 되돌리기. 깊어질수록 세게 당겨 왕관이 둥글게 닫힌다.
      next += (UP - next) * (0.08 + depth * 0.035);
      grow(endX, endY, next, length * (0.76 + rand() * 0.1), Math.max(0.5, width * 0.66), depth + 1);
    }
  }

  // 줄기 — 밑동에서 위로. 자리와 크기는 아래에서 다시 맞춘다.
  grow(0, 0, UP + (rand() - 0.5) * 0.08, 20, 6.6, 0);

  // ── 화면에 맞춰 넣기 ────────────────────────────────────────────
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const see = (x: number, y: number, pad = 0) => {
    minX = Math.min(minX, x - pad); maxX = Math.max(maxX, x + pad);
    minY = Math.min(minY, y - pad); maxY = Math.max(maxY, y + pad);
  };
  see(0, 0);
  for (const b of raw) { see(b.x1, b.y1); see(b.x2, b.y2); see(b.cx, b.cy); }
  for (const l of rawLeaves) see(l.cx, l.cy, l.r);

  const scale = Math.min(
    (FIT.right - FIT.left) / Math.max(1e-6, maxX - minX),
    (FIT.bottom - FIT.top) / Math.max(1e-6, maxY - minY),
  );
  // 가로는 가운데로, 세로는 밑동이 땅에 닿도록 아래에 붙인다.
  const offsetX = (FIT.left + FIT.right) / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = FIT.bottom - maxY * scale;
  const tx = (x: number) => x * scale + offsetX;
  const ty = (y: number) => y * scale + offsetY;

  const branches: Branch[] = raw.map((b) => ({
    d: `M${tx(b.x1).toFixed(2)} ${ty(b.y1).toFixed(2)} Q${tx(b.cx).toFixed(2)} ${ty(b.cy).toFixed(2)} ${tx(b.x2).toFixed(2)} ${ty(b.y2).toFixed(2)}`,
    width: Math.max(0.5, b.width * scale),
    depth: b.depth,
  }));

  // 빛은 왼쪽 위에서 온다. 잎 색을 자리에 따라 밀어 주면 왕관이 공처럼 부풀어
  // 보인다 — 난수만으로 색을 흩뿌리면 평평한 모자이크가 된다.
  const placed = rawLeaves.map((l) => ({ cx: tx(l.cx), cy: ty(l.cy), r: l.r * scale, tone: l.tone }));
  let sumX = 0, sumY = 0;
  for (const l of placed) { sumX += l.cx; sumY += l.cy; }
  const cxMid = placed.length ? sumX / placed.length : 50;
  const cyMid = placed.length ? sumY / placed.length : 40;
  const leaves: Leaf[] = placed
    .map((l) => {
      // 왼쪽 위로 갈수록 1, 오른쪽 아래로 갈수록 0.
      const light = 0.5 + ((cxMid - l.cx) * 0.35 + (cyMid - l.cy) * 0.65) / 42;
      const tone = Math.min(1, Math.max(0, l.tone * 0.45 + light * 0.55));
      return { ...l, tone };
    })
    .sort((a, b) => a.tone - b.tone);

  // ── 열매 자리 ───────────────────────────────────────────────────
  // 바깥 가지 끝 중에서 고른다. 위에서부터 차례로 담으면 열매가 한쪽 어깨에
  // 몰리므로, **이미 고른 자리에서 가장 먼 것**을 하나씩 집어 왕관 전체에
  // 흩어 놓는다.
  const spots: { x: number; y: number }[] = [];
  const candidates = tips
    .filter((t) => t.depth >= 3)
    .map((t) => ({ x: tx(t.x) / VIEW_W, y: ty(t.y) / VIEW_H }))
    .filter((c) => c.x >= 0.08 && c.x <= 0.92 && c.y >= 0.06 && c.y <= 0.62);

  if (candidates.length > 0) {
    // 첫 자리는 왕관 한가운데에서 가장 가까운 가지 끝.
    const midX = candidates.reduce((sum, c) => sum + c.x, 0) / candidates.length;
    const midY = candidates.reduce((sum, c) => sum + c.y, 0) / candidates.length;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, (a.y - b.y) * 1.1);
    let pool = candidates.slice();
    let pick = pool.reduce((best, c) =>
      dist(c, { x: midX, y: midY }) < dist(best, { x: midX, y: midY }) ? c : best,
    );
    while (spots.length < 14) {
      spots.push(pick);
      pool = pool.filter((c) => dist(c, pick) >= 0.1);
      if (pool.length === 0) break;
      pick = pool.reduce((best, c) =>
        Math.min(...spots.map((s) => dist(c, s))) > Math.min(...spots.map((s) => dist(best, s)))
          ? c
          : best,
      );
    }
  }

  return { branches, leaves, fruitSpots: spots, base: { x: tx(0), y: ty(0) } };
}

/** 잎 색 — 어두운 뒤쪽에서 밝은 앞쪽까지. */
export const LEAF_TONES = ['#2F5A2C', '#3B6B33', '#48793B', '#568A47', '#69A257', '#7DB566'] as const;

export function leafColor(tone: number): string {
  const i = Math.min(LEAF_TONES.length - 1, Math.max(0, Math.floor(tone * LEAF_TONES.length)));
  return LEAF_TONES[i];
}
