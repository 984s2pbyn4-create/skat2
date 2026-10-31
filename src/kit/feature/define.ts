/** Идентификатор функции из docs/FEATURES.md: CORE-01, OP-08, BK-13, MK-02, SH-05. */
export type FeatureId = `${'CORE' | 'OP' | 'BK' | 'MK' | 'SH'}-${number}`;

/**
 * Манифест функции (docs/ARCHITECTURE.md §4).
 * Состояние, команды и слоты появятся вместе с ядром (веха M2).
 */
export interface FeatureManifest {
  readonly id: FeatureId;
  readonly title: string;
  /** Функции, без которых эта не работает. */
  readonly requires?: readonly FeatureId[];
}

export function defineFeature<const F extends FeatureManifest>(f: F): F {
  return f;
}

/** Проверка `requires`: каждая зависимость должна быть в сборке. Возвращает список нарушений. */
export function missingRequires(features: readonly FeatureManifest[]): string[] {
  const present = new Set(features.map((f) => f.id));
  const out: string[] = [];
  for (const f of features) {
    for (const r of f.requires ?? []) if (!present.has(r)) out.push(`${f.id} требует ${r}`);
  }
  return out;
}
