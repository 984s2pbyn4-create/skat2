/**
 * Текст service worker. Собирается при сборке со списком файлов (vite.config.ts).
 * Кэш отдельный для каждой копии приложения (стабильная и бета живут на одном домене).
 */
export function swSource(version: string, files: readonly string[]): string {
  return `const FILES = ${JSON.stringify(files)};
const BASE = new URL('./', self.location).href;
const PREFIX = 'skat2|' + BASE + '|';
const CACHE = PREFIX + ${JSON.stringify(version)};
const OWN = new Set(FILES.map((f) => new URL(f, BASE).href));
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = r.url.split('#')[0].split('?')[0];
  if (r.mode === 'navigate') {
    if (url !== BASE && url !== BASE + 'index.html') return;
    e.respondWith(fetch(r).catch(() => caches.open(CACHE).then((c) => c.match(BASE)).then((m) => m || Response.error())));
    return;
  }
  if (!OWN.has(url)) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(url)).then((m) => m || fetch(r)));
});
`;
}
