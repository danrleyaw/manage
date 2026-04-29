// Fut Manager — Service Worker
// Estratégia: Network First com fallback para cache
const CACHE_NAME = 'fut-manager-v1';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Instala e faz cache dos recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Intercepta requisições
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e do Supabase (sempre online)
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Atualiza o cache com a resposta mais recente
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve do cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback para index.html (SPA routing)
          return caches.match('/index.html');
        });
      })
  );
});
