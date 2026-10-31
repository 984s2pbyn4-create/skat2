/** Офлайн-работа в браузере: service worker из сборки (sw.js рядом с index.html). В EXE файлы и так локальные. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !location.protocol.startsWith('http'))
    return;
  navigator.serviceWorker
    .register('./sw.js')
    .catch((e: unknown) => console.warn('Офлайн-режим недоступен:', e));
}
