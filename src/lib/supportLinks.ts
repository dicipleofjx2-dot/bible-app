import { Platform } from 'react-native';

/**
 * 쿠팡 바로가기 전용 페이지 주소.
 *
 * 앱에서 홈 화면에 아이콘을 직접 깔아 줄 방법은 없다(iOS 는 원천 차단이고
 * 안드로이드도 OS 확인 팝업이 필요하다). 대신 배너를 아이콘·매니페스트로
 * 등록해 둔 전용 페이지(public/coupang.html)를 열어, 사용자가 브라우저의
 * 「홈 화면에 추가」를 한 번 누르면 그 아이콘 그대로 홈 화면에 생기고 탭하면
 * 쿠팡으로 바로 연결된다.
 *
 * 경로는 슬래시 없는 `/coupang` 이다(cleanUrls 로 coupang.html 에 매핑).
 * `/coupang/` 형태는 vercel.json 의 trailingSlash:false 와 부딪혀 앱 라우팅으로
 * 넘어가 버린 적이 있다 — 사이트 전체가 쓰는 확장자 없는 주소 관례를 따른다.
 *
 * **이 파일에만 적는다.** 홈 화면의 후원 상자와 후원 화면이 같은 곳을 열어야
 * 하는데, 두 군데에 적어 두면 한쪽만 고쳐지는 날이 온다.
 */
export function getCoupangShortcutUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/coupang`;
  }
  return 'https://dicipleofjx-bible.vercel.app/coupang';
}
