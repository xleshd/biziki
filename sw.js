const CACHE = 'biziki-v9';
const FILES = ['./index.html', './manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});
self.addEventListener('push', e => {
  let title = 'Bizİki', body = 'Yeni bir bildirim', extra = {};
  if (e.data) {
    try {
      const j = e.data.json();
      const n = j.notification || {};
      const d = j.data || {};
      title = n.title || j.title || d.title || title;
      body  = n.body  || j.body  || d.body  || body;
      extra = j;
    } catch (_) {
      try { body = e.data.text(); } catch (__) {}
    }
  }
  const opts = { body, icon:'icon.png', badge:'icon.png', tag:(title + '|' + body), vibrate:[120,60,120], data:extra };
  e.waitUntil(self.registration.showNotification(title, opts));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list=>{
    for(const c of list){ if(c.url.includes(self.location.origin) && 'focus' in c) return c.focus(); }
    if(clients.openWindow) return clients.openWindow('./');
  }));
});
