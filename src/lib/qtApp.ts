import { Platform } from 'react-native';

/**
 * 「오늘의 큐티」를 데이빗 큐티 앱으로 보낸다.
 *
 * 큐티는 데이빗바이블 안의 한 화면에서 **따로 도는 앱**으로 옮겨졌다. 본문 이해
 * 자료·영어 단어카드·30포인트가 거기 있다. 계정은 같은 Supabase 프로젝트를 쓰므로
 * 카카오로 들어온 같은 사람이고, 큐티에서 받은 포인트는 통독 포인트에 합산된다.
 *
 * ## 새 창이 아니라 **같은 창**으로 보낸다
 *
 * 데이빗바이블 웹은 브라우저 저장소(OPFS)를 한 탭만 잡을 수 있어서, 탭이 여럿이면
 * 나중 탭이 "저장소 오류" 화면을 띄운다(src/lib/openExternal.ts 참고). 큐티 앱은
 * 다 마치면 「데이빗바이블로 돌아가기」로 이 주소로 되돌려 보내 주므로, 같은 창을
 * 쓰는 편이 안전하고 오가는 느낌도 자연스럽다.
 *
 * 폰 앱(네이티브)에는 창이라는 것이 없어 기본 브라우저로 넘긴다.
 */

/** 데이빗 큐티 주소. 바뀌면 여기만 고친다. */
export const QT_APP_ORIGIN = 'https://dg-qt.vercel.app';

/** 큐티를 마치고 돌아올 곳. 큐티 앱이 허용 목록으로 검사한다. */
const RETURN_ORIGIN = 'https://dicipleofjx-bible.vercel.app';

function returnUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return RETURN_ORIGIN;
}

/**
 * 그날의 큐티 주소.
 *
 * **인증 토큰을 주소에 싣지 않는다.** 큐티 앱이 카카오 로그인을 직접 받고, 같은
 * Supabase 프로젝트라 같은 사람이 된다. 주소에 토큰을 실으면 브라우저 기록·서버
 * 로그·공유한 주소에 그대로 남는다.
 */
export function qtAppUrl(date?: string): string {
  const params = new URLSearchParams({ source: 'david-bible', returnUrl: returnUrl() });
  if (date) params.set('date', date);
  return `${QT_APP_ORIGIN}/qt/today?${params.toString()}`;
}
