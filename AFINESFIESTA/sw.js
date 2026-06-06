/* Afines Fiesta · Service Worker
   Maneja las notificaciones push aunque la app esté completamente cerrada.
   Al pulsar una notificación, lleva al usuario a la pantalla correcta.
*/

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

/* EVENTO CLAVE: llega un push del servidor */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch(e) { data = { title:'Afines', body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'Afines Fiesta';
  const options = {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: data.tag || 'afines',
    vibrate: [80, 50, 80],
    renotify: true,
    data: {                 // datos para enrutar al hacer clic
      kind:    data.kind    || '',
      fromId:  data.fromId  || '',
      otherId: data.otherId || ''
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* Al tocar la notificación → abrir/foco en la app + ir a la pantalla relevante */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = (event.notification.data) || {};
  const kind   = d.kind || '';
  const fromId = d.fromId || '';
  const otherId= d.otherId || '';

  // Construir la URL con parámetros para que el cliente lea y vaya solo
  let route = './';
  if (kind === 'message' || kind === 'like') {
    if (fromId) route = './?open=chat&with=' + encodeURIComponent(fromId);
  } else if (kind === 'match') {
    const id = otherId || fromId;
    if (id) route = './?open=chat&with=' + encodeURIComponent(id);
  } else if (kind === 'group_message') {
    route = './?open=group&tab=chat';
  } else if (kind === 'invite') {
    route = './?open=group';
  }

  event.waitUntil((async () => {
    const all = await clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const c of all) {
      try {
        await c.focus();
        // si la pestaña está ya abierta, le mando un postMessage para enrutar sin recargar
        c.postMessage({ type:'navigate', kind, fromId, otherId });
        return;
      } catch(e) {}
    }
    if (clients.openWindow) {
      await clients.openWindow(route);
    }
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // El cliente la recreará la próxima vez que abra la app.
});
