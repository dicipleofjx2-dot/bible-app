/**
 * 블로그 「성경통독 365」(bible365.dgaiworks.com) — 그날 범위의 해설·지도·배경·문제가 있는 곳.
 *
 * 블로그 글은 한 가지 계획으로 나뉘어 있고, 앱은 시작 요일마다 하루 범위가 다르다.
 * 그래서 글 주소를 앱이 계산하지 않고 **장 번호만 넘긴다** — 블로그의 /go/<장> 이
 * 그 장이 든 글로 보내 준다(성경 전체 장 번호, 창세기 1장 = 1).
 *
 * 단추는 고르는 사람만 누른다. 퀴즈를 풀려면 블로그를 거치게 하거나, 블로그에 들르면
 * 포인트를 주는 일은 하지 않는다 — 광고 페이지를 보상으로 보게 하는 것은 애드센스 금지 사항이다.
 */
export const BLOG_365 = 'https://bible365.dgaiworks.com';

export function blogUrlForChapter(chapter: number): string {
  return `${BLOG_365}/go/${chapter}/`;
}
