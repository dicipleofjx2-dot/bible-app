import { Linking, Platform } from 'react-native';

import { withHandoff } from '@/lib/appHandoff';

/**
 * 로그인이 따로인 우리 식구 앱. 여기 드는 앱은 누르는 순간 바이블의 로그인으로
 * 열쇠를 받아 **로그인 화면 없이** 열린다(src/lib/appHandoff.ts).
 */
const HANDOFF_ORIGINS = new Set([
  'https://prayer.dgaiworks.com',
  'https://dg-qt.vercel.app',
  'https://record.homeschool5.com',
]);

function handoffTarget(url: string): { origin: string; next: string } | null {
  try {
    const u = new URL(url);
    if (!HANDOFF_ORIGINS.has(u.origin)) return null;
    return { origin: u.origin, next: `${u.pathname}${u.search}` || '/' };
  } catch {
    return null;
  }
}

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
  const target = handoffTarget(url);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (!target) {
      // noopener 는 주지 않는다. 그걸 주면 브라우저가 이름을 무시하고 매번 새 창을
      // 연다 — 이름을 준 이유가 통째로 사라진다.
      window.open(url, windowName, 'noreferrer');
      return;
    }
    // 열쇠를 받는 동안 기다리면 브라우저가 「누른 직후가 아니다」며 새 창을 막는다.
    // 그래서 창부터 (빈 채로) 열어 두고 열쇠가 오면 주소를 채운다.
    // noreferrer 를 주면 창 손잡이를 못 받으므로 이 길에서는 주지 않는다 — 우리 앱끼리다.
    const win = window.open('', windowName);
    if (!win) {
      window.open(url, windowName, 'noreferrer');
      return;
    }
    void withHandoff(target.origin, url, target.next).then((finalUrl) => {
      win.location.href = finalUrl;
    });
    return;
  }

  if (target) {
    void withHandoff(target.origin, url, target.next).then((finalUrl) => Linking.openURL(finalUrl));
    return;
  }
  void Linking.openURL(url);
}

/** 창 이름. 같은 앱은 늘 같은 이름을 써야 한 창에 모인다. */
export const APP_WINDOW = {
  smartBulletin: 'smartbulletin',
  /** 교회운영ON(교적·재정·목양). 주보와 다른 앱이라 창도 따로 둔다 — 한 창에 모으면 주보를 보다가
   *  관리 화면으로 덮이고, 돌아갈 길이 뒤로가기밖에 없어진다. */
  churchOn: 'churchon',
  /** 대한성서공회·ESV·BibleGateway 등 바깥 성경 사이트. 역본이 달라도 한 창에
   *  모은다 — 성경을 읽다 보면 장을 여러 번 넘기게 되는데, 그때마다 탭이 하나씩
   *  늘면 금세 스무 개가 된다. */
  bibleReader: 'biblereader',
  /** 목회동행 실시간 화면. 걷는 동안 여러 번 열게 되므로 한 창에 모은다. */
  ministryLive: 'ministrylive',
  /** 블로그(dgaiworks.com)에 있는 사용설명서. 여러 글을 오가도 한 창에 모은다. */
  guide: 'dgguide',
  /** 24시간 기도의 집. 기도 시간을 맡아 두고 여러 번 드나드는 곳이라 한 창에 모은다. */
  prayerHouse: 'prayerhouse',
  /** 데이빗스톤 디지털캠퍼스(영상 훈련). 강의를 이어 보며 드나드는 곳이라 한 창에 모은다. */
  campus: 'davidcampus',
  /** 바이블 저니 ON(지도로 보는 성경·세계사). 지도와 3D 지형을 쓰는 무거운 화면이라
   *  탭이 여러 개 뜨면 폰에서 눈에 띄게 느려진다. 반드시 한 창에 모은다. */
  bibleJourney: 'biblejourney',
  /** 말씀 웹툰 연재(워드프레스 「설교 웹툰」). 화를 넘겨 가며 읽으므로 한 창에 모은다. */
  webtoon: 'sermonwebtoon',
  /** 성경통독 웹툰(워드프레스 「통독 웹툰」). 설교 웹툰과 다른 연재라 창도 따로 — 통독하다 열고 돌아온다. */
  readingWebtoon: 'readingwebtoon',
} as const;
