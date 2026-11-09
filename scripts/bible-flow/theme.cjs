/** 성경맥잡기 — 전자책·PPT 공통 색과 글꼴. 맥마다 한 색이다. */
const FONT = 'Malgun Gothic'; // 맑은 고딕 — 한국어 Windows·Office 기본 탑재

const INK = '2A211B'; // 본문 글자
const MUTED = '6B5C52'; // 보조 글자
const TINT = 'F2F0EE'; // 카드 바탕
const LINE = 'D9D2CB'; // 표 선

/** 1–6과 색. PPT 테마의 accent1–6 과 같은 값이다. */
const LESSON_COLORS = ['5B6B7F', 'B5532F', '9A6510', '2F7466', '64457F', '952B38'];

/** 흰 바탕 위 옅은 칠 (색을 흰색과 섞는다). */
function soft(hex, amount = 0.88) {
  const n = parseInt(hex, 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

module.exports = { FONT, INK, MUTED, TINT, LINE, LESSON_COLORS, soft };
