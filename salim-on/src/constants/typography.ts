/**
 * 서체는 기기 기본을 쓴다. 각 기기가 자기 화면에 맞춰 힌팅까지 해 그리므로
 * 작은 글씨에서 가장 또렷하다.
 *
 * 기본 크기를 흔한 앱보다 한 단계 키웠다 — 부엌에서 한 발 떨어져 보거나,
 * 아이가 한 손으로 보는 화면이다.
 */

export const FontWeight = {
  regular: '400',
  medium: '600',
  bold: '700',
} as const;

export const Type = {
  screenTitle: { fontSize: 26, lineHeight: 34, fontWeight: FontWeight.bold },
  sectionTitle: { fontSize: 15, lineHeight: 20, letterSpacing: 0.2, fontWeight: FontWeight.medium },
  itemTitle: { fontSize: 17, lineHeight: 24, fontWeight: FontWeight.bold },
  itemDescription: { fontSize: 14, lineHeight: 20, fontWeight: FontWeight.regular },
  body: { fontSize: 16, lineHeight: 26, fontWeight: FontWeight.regular },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: FontWeight.regular },
} as const;
