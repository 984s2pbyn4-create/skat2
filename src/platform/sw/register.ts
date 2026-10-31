/** Офлайн-работа: service worker из сборки (sw.js рядом с index.html). */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('./sw.js')
    .catch((e: unknown) => console.warn('Офлайн-режим недоступен:', e));
}
