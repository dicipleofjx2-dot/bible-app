/**
 * 앱 전체 서체.
 *
 * 2026-08-14에 기기 기본 서체로 되돌렸다. 그 전에는 본문에 조선신명조(명조),
 * 제목에 SB어그로, 나머지에 리아산스를 썼는데 폰에서 읽기 불편하다는 판단이었다.
 * 기기 기본 서체는 각 기기가 자기 화면에 맞춰 힌팅까지 최적화해 그리므로
 * 작은 글씨에서 가장 또렷하다.
 *
 * 서체를 파일로 지정하지 않으므로 굵기는 다시 `fontWeight`로 표현한다.
 * (커스텀 TTF를 쓸 때는 fontWeight가 먹지 않아 굵기마다 패밀리를 따로 등록했었다.
 *  기본 서체로 돌아왔으니 그 제약이 없어졌다.)
 */

/** 굵기. 기기 기본 서체를 쓰므로 fontWeight로 준다. */
export const FontWeight = {
  regular: '400',
  medium: '600',
  bold: '700',
  extraBold: '800',
} as const;

/**
 * 화면에서 반복해서 쓰는 글자 묶음.
 * 한글은 같은 크기라도 라틴 문자보다 빽빽해 보여서 줄간격을 넉넉히 잡았다.
 */
export const Type = {
  screenTitle: { fontSize: 26, lineHeight: 34, fontWeight: FontWeight.bold },
  sectionTitle: { fontSize: 15, lineHeight: 20, letterSpacing: 0.2, fontWeight: FontWeight.medium },
  itemTitle: { fontSize: 16, lineHeight: 22, fontWeight: FontWeight.bold },
  itemDescription: { fontSize: 13, lineHeight: 19, fontWeight: FontWeight.regular },
  body: { fontSize: 16, lineHeight: 26, fontWeight: FontWeight.regular },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: FontWeight.regular },
  /** 성경 본문처럼 오래 읽는 글. 줄간격을 넉넉히 둔다. */
  reading: { fontSize: 18, lineHeight: 32, fontWeight: FontWeight.regular },
} as const;

/**
 * 예전 코드가 `fontFamily: FontFamily.bold`처럼 쓰던 자리를 그대로 살려 두기 위한 것.
 * 값은 모두 undefined — 기기 기본 서체를 쓴다는 뜻이다. 굵기가 필요한 자리는
 * 함께 `fontWeight`를 지정한다.
 */
export const FontFamily = {
  regular: undefined,
  bold: undefined,
  extraBold: undefined,
  display: undefined,
  displayMedium: undefined,
  serif: undefined,
} as const;

/** 더 이상 커스텀 서체를 싣지 않는다. useFonts에 빈 객체를 넘겨도 문제없다. */
export const FONT_ASSETS = {};
