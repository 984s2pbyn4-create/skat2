import { signal } from '@preact/signals';
import { DEFAULT_SETTINGS, parseSettings, type Settings, type Theme } from '@core/model/settings';
import { dbGet, dbPut, persistStorage } from '@platform/storage/db';

/** Этап запуска: заставка → (PIN) → работа. */
export type Phase = 'boot' | 'locked' | 'ready';

export const phase = signal<Phase>('boot');
export const settings = signal<Settings>(DEFAULT_SETTINGS);
/** Ключ данных текущего сеанса — появляется после ввода PIN. */
export const dataKey = signal<CryptoKey | null>(null);
/** Сообщение для пользователя после запуска (порча настроек, недоступное хранилище). */
export const notice = signal('');

const THEME_COLOR: Record<Theme, string> = { night: '#070b08', red: '#0a0000' };

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  try {
    // Копия для заставки: тема применяется до загрузки приложения, без вспышки.
    localStorage.setItem('skat2-theme', theme);
  } catch {
    /* приватный режим — не критично */
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  settings.value = { ...settings.value, ...patch };
  applyTheme(settings.value.theme);
  await dbPut('settings', 'app', settings.value);
}

const MIN_SPLASH_MS = 700;

export async function boot(): Promise<void> {
  const t0 = performance.now();
  try {
    const r = parseSettings(await dbGet('settings', 'app'));
    settings.value = r.settings;
    if (r.problem) notice.value = r.problem;
  } catch (e) {
    console.error(e);
    notice.value = 'Хранилище недоступно: изменения не сохранятся.';
  }
  applyTheme(settings.value.theme);
  persistStorage().catch(() => null);
  const wait = MIN_SPLASH_MS - (performance.now() - t0);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  phase.value = settings.value.vault ? 'locked' : 'ready';
}
