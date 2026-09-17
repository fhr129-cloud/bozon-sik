// 온정 F&B 보존식 제출 — 서비스워커
// 목적: 홈화면 앱(PWA) 설치 지원 + 앱 껍데기 캐시
// 원칙: 제출 데이터·사진은 절대 캐시하지 않는다 (항상 최신이어야 함)

const CACHE = 'bozon-shell-v1';

// 앱 껍데기만 미리 받아둠
const SHELL = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './manifest.json'
];

self.addEventListener('install', e => {
  // 새 버전이 나오면 즉시 대기 상태를 건너뜀
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 같은 출처가 아니면 건드리지 않음
  // (Firebase, Firestore, Storage, gstatic, CDN — 전부 네트워크 직행)
  if (url.origin !== self.location.origin) return;

  // HTML은 네트워크 우선 — 배포한 수정본이 바로 반영되도록
  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 아이콘·정적 파일은 캐시 우선
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
