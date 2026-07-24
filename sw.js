const CACHE = 'biziki-v5';
const FILES = ['./index.html', './manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});
self.addEventListener('push', e => {
  let data = { title:'Bizİki', body:'Yeni bir bildirim' };
  try { if(e.data) data = Object.assign(data, e.data.json()); } catch(_) { if(e.data) data.body = e.data.text(); }
  const opts = { body:data.body||'', icon:data.icon||'icon.png', badge:data.icon||'icon.png', tag:data.tag||'default', vibrate:[120,60,120], data:data };
  e.waitUntil(self.registration.showNotification(data.title||'Bizİki', opts));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list=>{
    for(const c of list){ if(c.url.includes(self.location.origin) && 'focus' in c) return c.focus(); }
    if(clients.openWindow) return clients.openWindow('./');
  }));
});