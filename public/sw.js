/*
 * 데이빗바이블 웹푸시를 받아 알림창에 띄우는 일꾼.
 *
 * 이 파일은 주보 화면과 따로, 브라우저가 백그라운드에서 돌린다. 그래서 앱을
 * 닫아 두었어도 알림이 뜬다.
 *
 * 번들러를 거치지 않고 그대로 나가는 파일이라 옛 문법으로 적는다.
 */

self.addEventListener("install", () => {
  // 새 일꾼을 곧바로 쓴다. 안 그러면 예전 일꾼이 살아 있는 동안 새 알림 모양이
  // 반영되지 않는다.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "알림", body: event.data ? event.data.text() : "" };
  }

  var title = payload.title || "알림";
  var options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.png",
    badge: "/favicon.png",
    // 같은 tag 면 새 알림이 옛것을 덮는다. 편지가 알림창에 쌓이지 않게.
    tag: payload.tag || undefined,
    data: { url: payload.url || "/" },
    // 어르신들이 알림창을 지나치지 않게 진동을 준다(안드로이드).
    vibrate: [80, 40, 80],
  };

  // **덮어쓸 때도 다시 알린다.**
  //
  // tag 로 교체되는 알림은 renotify 가 없으면 소리도 진동도 없이 조용히 바뀐다.
  // 그래서 시험 알림은 받았는데 그 뒤에 올라온 글은 "안 왔다"가 됐다 — 알림창을
  // 열어 보면 들어와 있지만 아무도 그걸 열어 보지 않는다.
  //
  // renotify 는 tag 가 있을 때만 줄 수 있다. 없이 주면 브라우저가 TypeError 를
  // 던져 알림이 통째로 안 뜬다.
  if (options.tag) options.renotify = true;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/";

  // 이미 열어 둔 데이빗바이블 탭이 있으면 그것을 앞으로 가져온다. 매번 새 탭을 열면
  // 탭이 쌓인다.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (var i = 0; i < list.length; i += 1) {
        var client = list[i];
        if (client.url.indexOf(self.location.origin) === 0 && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
