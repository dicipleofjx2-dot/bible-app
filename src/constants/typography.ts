/**
 * 앱 전체 서체.
 *
 * 커스텀 TTF를 쓰면 React Native에서 `fontWeight`가 먹지 않는다 — 굵기마다
 * 별도의 패밀리로 등록해서 이름으로 골라 써야 한다. 그래서 아래처럼 굵기별
 * 상수를 두고, 스타일에서는 fontWeight 대신 fontFamily를 지정한다.
 * (안드로이드에서 fontWeight를 함께 주면 가짜 굵게가 덧입혀져 뭉개진다.)
 *
 * 역할 나눔
 *  - 본문·목록·버튼: 리아산스(RiaSans) — 획이 고르고 한글 가독성이 좋다
 *  - 화면 제목·큰 숫자: SB 어그로 — 둥글고 또렷해서 제목에서 눈에 잘 걸린다
 */
export const FontFamily = {
  /** 본문 기본 */
  regular: 'RiaSans',
  /** 강조, 버튼, 항목 이름 */
  bold: 'RiaSans-Bold',
  /** 숫자·통계처럼 힘이 필요한 곳 */
  extraBold: 'RiaSans-ExtraBold',
  /** 화면 제목 */
  display: 'SBAggroB',
  /** 소제목 */
  displayMedium: 'SBAggroM',
} as const;

/**
 * 폰트 파일 매핑. expo-font의 useFonts에 그대로 넘긴다.
 * 파일명에 공백이나 한글이 있으면 번들러가 자산을 못 찾는 일이 있어
 * 복사하면서 영문으로 바꿔 두었다.
 */
export const FONT_ASSETS = {
  RiaSans: require('../../assets/fonts/RiaSans-Regular.ttf'),
  'RiaSans-Bold': require('../../assets/fonts/RiaSans-Bold.ttf'),
  'RiaSans-ExtraBold': require('../../assets/fonts/RiaSans-ExtraBold.ttf'),
  SBAggroB: require('../../assets/fonts/SBAggroB.ttf'),
  SBAggroM: require('../../assets/fonts/SBAggroM.ttf'),
};

/**
 * 화면에서 반복해서 쓰는 글자 크기 묶음.
 * 한글은 같은 크기라도 라틴 문자보다 빽빽해 보여서 줄간격을 넉넉히 잡았다.
 */
export const Type = {
  screenTitle: { fontFamily: FontFamily.display, fontSize: 26, lineHeight: 34 },
  sectionTitle: { fontFamily: FontFamily.displayMedium, fontSize: 15, lineHeight: 20, letterSpacing: 0.2 },
  itemTitle: { fontFamily: FontFamily.bold, fontSize: 16, lineHeight: 22 },
  itemDescription: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 },
  body: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 26 },
  caption: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
} as const;
