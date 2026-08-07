/**
 * 앱 전체 서체.
 *
 * 커스텀 TTF를 쓰면 React Native에서 `fontWeight`가 먹지 않는다 — 굵기마다
 * 별도의 패밀리로 등록해서 이름으로 골라 써야 한다. 그래서 아래처럼 굵기별
 * 상수를 두고, 스타일에서는 fontWeight 대신 fontFamily를 지정한다.
 * (안드로이드에서 fontWeight를 함께 주면 가짜 굵게가 덧입혀져 뭉개진다.)
 *
 * 역할 나눔
 *  - 성경 본문·주석·편지처럼 오래 읽는 글: 조선신명조 — 명조(세리프)라 가로획이
 *    가늘고 세로획이 굵어 줄을 따라가기 쉽다. 성경은 원래 명조로 조판해 온 글이다
 *  - 목록·버튼·라벨: 리아산스 — 짧게 끊어 읽는 자리에서 또렷하다
 *  - 화면 제목: SB 어그로 — 둥글고 또렷해서 제목에서 눈에 잘 걸린다
 *  - 날짜처럼 아주 작은 글씨: 시스템 기본(지정하지 않음) — 작은 크기에서는
 *    기기가 최적화해 그리는 쪽이 가장 또렷하다
 */
export const FontFamily = {
  /** UI 기본 — 라벨, 설명, 짧은 문구 */
  regular: 'RiaSans',
  /** 강조, 버튼, 항목 이름 */
  bold: 'RiaSans-Bold',
  /** 숫자·통계처럼 힘이 필요한 곳 */
  extraBold: 'RiaSans-ExtraBold',
  /** 화면 제목 */
  display: 'SBAggroB',
  /** 소제목 */
  displayMedium: 'SBAggroM',
  /** 오래 읽는 글 — 성경 본문, 주석, 목자편지, 전자책 */
  serif: 'ChosunSm',
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
  // 원본 조선신명조는 7.8MB다. 한글 완성형·자모·ASCII·자주 쓰는 기호만 남겨
  // 3.17MB로 줄여 두었다(한자와 다국어 글리프 제거). 다시 만들 일이 있으면
  // subset-font로 같은 문자 집합을 뽑으면 된다.
  ChosunSm: require('../../assets/fonts/ChosunSm.ttf'),
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
  /** 오래 읽는 글. 명조는 같은 크기라도 고딕보다 작아 보여서 한 단계 키웠다. */
  reading: { fontFamily: FontFamily.serif, fontSize: 18, lineHeight: 33 },
} as const;
