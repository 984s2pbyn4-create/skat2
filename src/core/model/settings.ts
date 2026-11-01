import * as z from 'zod/mini';

/** Хранилище ключа данных, закрытого PIN-кодом (CORE-15). */
export const VaultSchema = z.object({
  salt: z.string(),
  iv: z.string(),
  wrapped: z.string(),
  iterations: z.int().check(z.gte(210_000)),
});
export type Vault = z.infer<typeof VaultSchema>;

export const THEMES = ['night', 'red'] as const;
export type Theme = (typeof THEMES)[number];

export const SettingsSchema = z.object({
  version: z.literal(1),
  theme: z.enum(THEMES),
  vault: z.nullable(VaultSchema),
  /** Выключенные на устройстве функции (CORE-19). */
  off: z.optional(z.array(z.string())),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = { version: 1, theme: 'night', vault: null };

/** Результат загрузки: настройки всегда валидны; проблема — сообщение для пользователя. */
export interface LoadedSettings {
  readonly settings: Settings;
  readonly problem?: string;
}

/** Проверка схемой при загрузке. Испорченные данные не роняют приложение: берутся значения по умолчанию. */
export function parseSettings(raw: unknown): LoadedSettings {
  if (raw === undefined || raw === null) return { settings: DEFAULT_SETTINGS };
  const r = SettingsSchema.safeParse(raw);
  if (r.success) return { settings: r.data };
  return { settings: DEFAULT_SETTINGS, problem: 'Настройки повреждены и сброшены к исходным.' };
}
