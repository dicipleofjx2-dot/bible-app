/*
 * 아주 작은 서비스워커.
 *
 * **기록을 캐시하지 않는다.** 꿈과 예언이 브라우저 캐시에 사본으로 남으면,
 * 기기를 빌려준 사이에 다른 사람이 열어 볼 수 있다(기획서 §12). 껍데기(html/css)만
 * 담고 데이터는 언제나 그물 너머에서 새로 가져온다.
 */
const SHELL = 'spirit-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(['/'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;      // supabase 는 건드리지 않는다
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 화면 껍데기만 보관한다.
        if (request.mode === 'navigate') {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit ?? caches.match('/'))),
  );
});
