import { Linking, Platform } from 'react-native';

/**
 * 우리 식구 앱(스마트주보·교회 홈페이지)을 연다.
 *
 * 웹에서 `Linking.openURL` 은 `window.open(url, '_blank')` 이라 누를 때마다 새
 * 탭을 만든다. 주보를 세 번 누르면 주보 탭이 셋이 되고, 데이빗바이블 자신도
 * 여러 탭에 뜨면 브라우저 저장소(OPFS)를 한 탭만 잡을 수 있어서 나중 탭이
 * "저장소 오류" 화면을 띄운다 — "창이 여러 개 떠 있으면 안 열린다"가 이것이다.
 *
 * 창에 이름을 주면 그 이름의 창이 이미 있을 때 새로 만들지 않고 **그 창에
 * 띄운다.** 없으면 그때 하나 만든다.
 *
 * 폰 앱에서는 창이라는 것이 없다. 그쪽은 지금처럼 기본 브라우저로 넘긴다.
 */
export function openAppWindow(url: string, windowName: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // noopener 는 주지 않는다. 그걸 주면 브라우저가 이름을 무시하고 매번 새 창을
    // 연다 — 이름을 준 이유가 통째로 사라진다.
    window.open(url, windowName, 'noreferrer');
    return;
  }
  void Linking.openURL(url);
}

/** 창 이름. 같은 앱은 늘 같은 이름을 써야 한 창에 모인다. */
export const APP_WINDOW = {
  smartBulletin: 'smartbulletin',
  churchSite: 'churchsite',
  /** 대한성서공회·ESV·BibleGateway 등 바깥 성경 사이트. 역본이 달라도 한 창에
   *  모은다 — 성경을 읽다 보면 장을 여러 번 넘기게 되는데, 그때마다 탭이 하나씩
   *  늘면 금세 스무 개가 된다. */
  bibleReader: 'biblereader',
  /** 목회동행 실시간 화면. 걷는 동안 여러 번 열게 되므로 한 창에 모은다. */
  ministryLive: 'ministrylive',
} as const;
