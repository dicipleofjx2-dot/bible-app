/**
 * 교회를 관리하는 화면은 이 앱에 없다.
 *
 * 데이빗바이블은 **개인 경건훈련 앱**이다. 성경·QT·통독·기도가 여기 있고,
 * 교회가 글을 쓰거나 판을 바꾸는 일은 웹 앱 둘이 맡는다.
 *
 *   · 스마트주보 — 목자의 편지 · 알림마당 · 알림팝업
 *   · 교회운영ON   — 게시판 · R2M 훈련과정 · 목장 리더 배정
 *
 * 성도가 **읽는** 화면은 전부 이 앱에 그대로 있다. 옮긴 것은 쓰는 화면뿐이다.
 *
 * ⚠️ 주소가 두 군데 있으면 안 된다. 홈 화면 타일(`(tabs)/index.tsx`)도 이 파일을
 * 본다. 도메인을 dgaiworks 하위로 옮길 때 **여기 한 줄만** 고치면 된다.
 */

export const SMART_BULLETIN_ORIGIN = 'https://bulletin.dgaiworks.com';
/** 교회운영ON(교적·재정·목양). 예전 이름은 「목회 AI」였다. */
export const CHURCH_ON_ORIGIN = 'https://churchon.dgaiworks.com';

/**
 * 교회를 모를 때 쓰는 주소.
 *
 * 두 앱의 현관은 로그인한 사람이 속한 교회가 하나면 곧장 그 교회로 보낸다.
 * 그래서 슬러그를 몰라도 길이 끊기지 않는다 — 한 번 더 누르게 될 뿐이다.
 */
export function bulletinAppUrl(churchSlug: string | null, path = ''): string {
  return churchSlug ? `${SMART_BULLETIN_ORIGIN}/church/${churchSlug}${path}` : SMART_BULLETIN_ORIGIN;
}

export function churchOnUrl(churchSlug: string | null, path = ''): string {
  return churchSlug ? `${CHURCH_ON_ORIGIN}/church/${churchSlug}${path}` : CHURCH_ON_ORIGIN;
}

/** 데이빗바이블로 나가는 글을 쓰는 자리 — 편지·알림마당·알림팝업이 여기 모여 있다. */
export function appContentUrl(churchSlug: string | null): string {
  return bulletinAppUrl(churchSlug, '/davidbible');
}

/** 데이빗바이블의 판을 바꾸는 자리 — 게시판·훈련과정·리더배정(교회운영ON 안에 있다). */
export function appSettingsUrl(churchSlug: string | null): string {
  return churchOnUrl(churchSlug, '/pastor/davidbible');
}
