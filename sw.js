const CACHE = 'biziki-v7';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text ? event.data.text() : '' }; }
  const n = data.notification || data;
  const title = n.title || data.title || 'Bizİki 💕';
  const body  = n.body  || data.body  || 'Sevgilinden bir şey var 💌';
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: '/icon.png', badge: '/icon.png', tag: data.tag || 'biziki', vibrate: [120, 60, 120],
    data: { url: data.url || '/' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/');
  if (isDoc) {
    event.respondWith(
      fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((cc) => cc.put(req, c)).catch(() => {}); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((cc) => cc.put(req, c)).catch(() => {}); return r; }).catch(() => cached);
      return cached || net;
    })
  );
});