/*
 * 쿠팡 바로가기 페이지(/coupang)만 맡는 아주 작은 일꾼.
 *
 * 왜 필요한가: 크롬이 「홈 화면에 추가」 설치창(beforeinstallprompt)을 주려면
 * 그 페이지를 맡은 서비스워커에 **fetch 처리기**가 있어야 한다. 루트의 sw.js 는
 * 알림만 다루고 fetch 를 안 받아서, 설치창이 아예 안 떴다.
 *
 * 캐시는 하지 않는다 — 그냥 그대로 지나가게 둔다. 목적은 "설치할 수 있는
 * 페이지"로 인정받는 것 하나뿐이고, 캐시를 하면 쿠팡 주소가 바뀌었는데도
 * 옛 화면이 남는 일이 생긴다.
 *
 * 범위(scope)를 /coupang 으로 좁혀 등록한다. 루트의 알림 일꾼을 건드리지 않기 위해서다.
 */

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request));
});
