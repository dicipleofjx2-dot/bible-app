/**
 * 앱 아이콘·여는 화면 그림을 만든다.
 *
 *   node scripts/make-app-icons.mjs
 *
 * 그림판에서 그린 PNG 를 리포에 던져 넣지 않고 스크립트로 두는 이유가 있다.
 * 팔레트는 이미 두 번 바뀌었고(아이보리 → 바다빛 → 살구빛) 또 바뀔 것이다.
 * 그때 이 파일의 색 상수만 고치면 여섯 장이 한 번에 다시 나온다.
 *
 * ── 마크
 * 제네덴달의 배나무. 원래 아이콘은 그 배나무 **사진**이었는데, 48px 로 줄면
 * 갈색 얼룩이 되고 안드로이드가 원형으로 잘라 내면 더 뭉개졌다. 뜻은 두고
 * 형태만 알아볼 수 있게 배 열매 모양 수관 하나로 줄였다.
 *
 * ── 그리는 법
 * SVG 를 PNG 로 바꿔 주는 도구(sharp·resvg)가 이 환경에 없다. 대신 경로를
 * 직접 래스터라이즈한다 — 베지에를 잘게 쪼개 다각형으로 만들고, 주사선마다
 * 교차점을 구해 채운다. 세로로 4번 표본을 뜨고 가로는 겹친 길이를 그대로 재서
 * 계단이 안 보이게 한다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// ── 색 ──────────────────────────────────────────────────────
// src/constants/theme.ts 의 팔레트에서 가져왔다. 두 곳이 어긋나면 아이콘만
// 옛 색으로 남는다.
const GROUND_FROM = '#CE6E44'; // 왼쪽 위 (빛이 드는 쪽)
const GROUND_TO = '#A9502C'; // 오른쪽 아래
const CREAM = '#FBF2EA'; // 앱 바탕색 — 아이콘 위 나무
const GOLD = '#E9B44C'; // 꼭지와 잎
const CORAL = '#BC5C35'; // 여는 화면의 나무
const CORAL_GOLD = '#C98A2E'; // 크림 바탕에서도 보이도록 한 단계 누른 금색

// ── 마크 경로 (100×100 설계 상자, 중심은 (50, 47)) ──────────
// 꼭지는 선(stroke)이 아니라 채워지는 리본으로 그린다. 선을 다각형으로 부풀리는
// 코드를 따로 두지 않기 위해서다.
const CANOPY =
  'M50 12 C40 12 35 20.5 38 30 C41 40.4 27 44.2 27 53.7 C27 61.3 37 66 50 66 ' +
  'C63 66 73 61.3 73 53.7 C73 44.2 59 40.4 62 30 C65 20.5 60 12 50 12 Z';
// 줄기는 길고 곧게. 짧고 굵으면 나무가 아니라 버섯으로 읽힌다.
//
// 수관 바닥(66)과 벤치 널(76) 사이에 **줄기가 보이는 열 칸**을 비워 뒀다.
// 이 틈이 없으면 배가 탁자 위에 얹힌 것처럼 보이고 나무로 안 읽힌다.
const TRUNK = 'M47 60 L53 60 L54 88 C55 91 56 93 57 94 L43 94 C44 93 45 91 46 88 Z';
const STEM = 'M47.4 16 C46.8 10 47.6 6 50.2 2.8 L53.2 4.6 C50.8 7.6 50 10.6 50.4 16 Z';
const LEAF = 'M52 6.6 C57 3 62.5 4 65 7.2 C61.5 10.8 56 10.8 52 7.6 Z';

/** 모서리가 둥근 네모. 벤치 널과 다리에 쓴다. */
function roundRect(x, y, w, h, r) {
  return (
    `M${x + r} ${y} L${x + w - r} ${y} C${x + w} ${y} ${x + w} ${y} ${x + w} ${y + r} ` +
    `L${x + w} ${y + h - r} C${x + w} ${y + h} ${x + w} ${y + h} ${x + w - r} ${y + h} ` +
    `L${x + r} ${y + h} C${x} ${y + h} ${x} ${y + h} ${x} ${y + h - r} ` +
    `L${x} ${y + r} C${x} ${y} ${x} ${y} ${x + r} ${y} Z`
  );
}

// 앉는 자리. 그 배나무 아래는 마을 사람들이 말씀을 배우던 자리였다.
// 다리 끝(94)을 나무 뿌리 끝과 맞춘다 — 어긋나면 벤치가 공중에 뜬다.
const BENCH_SEAT = roundRect(27, 76, 46, 5, 2.5);
const BENCH_LEG_L = roundRect(31, 81, 3.5, 13, 1.75);
const BENCH_LEG_R = roundRect(65.5, 81, 3.5, 13, 1.75);

// ── 경로 파싱 (내가 쓴 것만 — 절대좌표 M/L/C/Z) ─────────────
function parsePath(d) {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/gi);
  const subpaths = [];
  let pts = null;
  let cx = 0;
  let cy = 0;
  let i = 0;
  const num = () => Number(tokens[i++]);

  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      if (pts && pts.length > 1) subpaths.push(pts);
      cx = num();
      cy = num();
      pts = [[cx, cy]];
    } else if (cmd === 'L') {
      cx = num();
      cy = num();
      pts.push([cx, cy]);
    } else if (cmd === 'C') {
      const x1 = num();
      const y1 = num();
      const x2 = num();
      const y2 = num();
      const x = num();
      const y = num();
      // 24 조각이면 1024px 에서 이음매가 안 보인다.
      for (let s = 1; s <= 24; s += 1) {
        const t = s / 24;
        const u = 1 - t;
        pts.push([
          u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
          u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
        ]);
      }
      cx = x;
      cy = y;
    } else if (cmd === 'Z') {
      if (pts && pts.length > 1) subpaths.push(pts);
      pts = null;
    }
  }
  if (pts && pts.length > 1) subpaths.push(pts);
  return subpaths;
}

/** 설계 상자(100×100)의 좌표를 실제 픽셀로. 중심 (50,48.4)을 (50,50)에 놓고 줄인다.
 * 48.4 는 마크의 실제 세로 한가운데다(꼭지 2.8 ~ 뿌리 94). 눈대중으로 47 을
 * 넣으면 아이콘이 위로 치우쳐 보인다. */
function transformed(subpaths, scale, size) {
  const k = size / 100;
  return subpaths.map((pts) =>
    pts.map(([x, y]) => [(50 + (x - 50) * scale) * k, (50 + (y - 48.4) * scale) * k])
  );
}

/**
 * 다각형들의 픽셀 덮임 정도(0~1)를 잰다.
 *
 * 주사선마다 모든 변과의 교차점을 구해 감김수(nonzero)로 안팎을 가른다.
 * 세로는 픽셀당 4번, 가로는 겹친 길이를 그대로 더한다.
 */
function coverage(subpaths, size) {
  const cov = new Float32Array(size * size);
  const edges = [];
  for (const pts of subpaths) {
    for (let i = 0; i < pts.length; i += 1) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      if (y1 !== y2) edges.push([x1, y1, x2, y2]);
    }
  }

  const SUB = 4;
  const xs = [];
  for (let py = 0; py < size; py += 1) {
    for (let s = 0; s < SUB; s += 1) {
      const y = py + (s + 0.5) / SUB;
      xs.length = 0;
      for (const [x1, y1, x2, y2] of edges) {
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          xs.push([x1 + ((y - y1) / (y2 - y1)) * (x2 - x1), y2 > y1 ? 1 : -1]);
        }
      }
      if (xs.length < 2) continue;
      xs.sort((a, b) => a[0] - b[0]);

      let winding = 0;
      for (let k = 0; k < xs.length - 1; k += 1) {
        winding += xs[k][1];
        if (winding === 0) continue;
        const xa = Math.max(0, xs[k][0]);
        const xb = Math.min(size, xs[k + 1][0]);
        if (xb <= xa) continue;
        const first = Math.floor(xa);
        const last = Math.min(size - 1, Math.ceil(xb) - 1);
        for (let px = first; px <= last; px += 1) {
          const overlap = Math.min(xb, px + 1) - Math.max(xa, px);
          if (overlap > 0) cov[py * size + px] += overlap / SUB;
        }
      }
    }
  }
  return cov;
}

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** 덮임 정도만큼 색을 얹는다(위에 그리기). */
function paint(png, cov, color, size) {
  const [r, g, b] = hex(color);
  for (let i = 0; i < size * size; i += 1) {
    const a = Math.min(1, cov[i]);
    if (a <= 0) continue;
    const o = i * 4;
    const dstA = png.data[o + 3] / 255;
    const outA = a + dstA * (1 - a);
    png.data[o] = Math.round((r * a + png.data[o] * dstA * (1 - a)) / outA);
    png.data[o + 1] = Math.round((g * a + png.data[o + 1] * dstA * (1 - a)) / outA);
    png.data[o + 2] = Math.round((b * a + png.data[o + 2] * dstA * (1 - a)) / outA);
    png.data[o + 3] = Math.round(outA * 255);
  }
}

/** 왼쪽 위에서 오른쪽 아래로 흐르는 바탕. 빛이 위에서 드는 것처럼 보인다. */
function fillGround(png, size) {
  const [r1, g1, b1] = hex(GROUND_FROM);
  const [r2, g2, b2] = hex(GROUND_TO);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = (x / size + y / size) / 2;
      const o = (y * size + x) * 4;
      png.data[o] = Math.round(r1 + (r2 - r1) * t);
      png.data[o + 1] = Math.round(g1 + (g2 - g1) * t);
      png.data[o + 2] = Math.round(b1 + (b2 - b1) * t);
      png.data[o + 3] = 255;
    }
  }
}

function render({ size, ground, scale, mark, accent }) {
  const png = new PNG({ width: size, height: size });
  png.data.fill(0);
  if (ground) fillGround(png, size);

  if (mark) {
    // **도형마다 따로 칠한다.** 여러 도형을 한 번에 넘기면 감김수(nonzero)가
    // 서로를 지운다 — 줄기의 회전 방향이 수관과 반대라, 겹친 자리가 통째로
    // 뚫려 수관 한가운데 구멍이 났었다. 같은 색으로 차례로 얹으면 합집합이 된다.
    const wood = [CANOPY, TRUNK];
    const gold = [STEM, LEAF, BENCH_SEAT, BENCH_LEG_L, BENCH_LEG_R];
    for (const d of wood) {
      paint(png, coverage(transformed(parsePath(d), scale, size), size), mark, size);
    }
    for (const d of gold) {
      paint(png, coverage(transformed(parsePath(d), scale, size), size), accent, size);
    }
  }
  return png;
}

// 안드로이드 적응형 아이콘은 가운데 66% 만 남기고 잘라 낸다. 앞면 마크는
// 그 안에 들어가야 어떤 모양으로 잘려도 나무가 온전하다.
const ADAPTIVE = 0.7;
const NORMAL = 0.8;

const assets = [
  { file: 'icon.png', size: 1024, ground: true, scale: NORMAL, mark: CREAM, accent: GOLD },
  { file: 'android-icon-background.png', size: 1024, ground: true },
  { file: 'android-icon-foreground.png', size: 1024, scale: ADAPTIVE, mark: CREAM, accent: GOLD },
  { file: 'android-icon-monochrome.png', size: 1024, scale: ADAPTIVE, mark: '#FFFFFF', accent: '#FFFFFF' },
  { file: 'splash-icon.png', size: 1024, scale: NORMAL, mark: CORAL, accent: CORAL_GOLD },
  // 어두운 모드 여는 화면은 그림을 따로 쓴다. 산호색 나무를 어두운 바탕(#241A16)에
  // 놓으면 대비가 3.8:1 로 묻힌다 — 크림색으로 뒤집는다.
  { file: 'splash-icon-dark.png', size: 1024, scale: NORMAL, mark: CREAM, accent: GOLD },
  { file: 'favicon.png', size: 196, ground: true, scale: NORMAL, mark: CREAM, accent: GOLD },
];

const dir = path.join(process.cwd(), 'assets', 'images');
for (const asset of assets) {
  const png = render(asset);
  const out = path.join(dir, asset.file);
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log(`${asset.file.padEnd(30)} ${asset.size}x${asset.size}  ${(fs.statSync(out).size / 1024).toFixed(0)}KB`);
}
