// Service worker do app do aluno: instalação na tela inicial, modo offline básico e notificações.
const CACHE = 'easy-wrestling-v2';
const SHELL = ['/', '/app', '/manifest.webmanifest', '/logo.png', '/favicon.png', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((url) => c.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegação: rede primeiro, cai para o shell em cache quando offline
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/app').then((r) => r || caches.match('/'))));
    return;
  }

  // Só arquivos estáticos da versão final vão para o cache (o servidor de desenvolvimento passa direto)
  const cacheable = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname === '/logo.png';
  if (!cacheable) return;
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }),
    ),
  );
});

// Push vindo de um servidor (Web Push): { title, body, url, tag }
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Easy Wrestling';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Novo aviso da academia.',
      tag: data.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/app' },
    }),
  );
});

// Tocar na notificação abre o app na tela do aviso (ou foca o app já aberto e leva até ela)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).pathname.startsWith('/app'));
      if (!open) return self.clients.openWindow(target);
      // a prévia do painel usa "?as=": mantém o parâmetro ao trocar de tela
      const url = new URL(target, self.location.origin);
      url.search = new URL(open.url).search;
      const go = 'navigate' in open && new URL(open.url).pathname !== url.pathname ? open.navigate(url.href).catch(() => open) : Promise.resolve(open);
      return go.then((c) => (c || open).focus());
    }),
  );
});
