// Service worker do Gestor Estrategista: recebe as notificações e abre a agenda ao tocar.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Gestor Estrategista', {
    body: d.corpo || 'Você tem avisos novos na agenda.',
    icon: '/icones/icone-192.png',
    badge: '/icones/badge-72.png',
    tag: d.tag || 'avisos',
    renotify: true,
    data: { url: d.url || '/agenda' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/agenda';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
    for (const j of janelas) {
      if ('focus' in j) { j.navigate(url); return j.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
