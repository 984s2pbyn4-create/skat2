import { signal } from '@preact/signals';
import type { FeatureId } from './define';

/** Профили устройства (CORE-19): какие функции видны на этом устройстве, без пересборки. */
export const SWITCHABLE: ReadonlyArray<readonly [FeatureId, string]> = [
  ['CORE-03', 'Загрузки и офлайн-участки'],
  ['CORE-04', 'Свои файлы карт .mbtiles'],
  ['CORE-05', 'Наложения и стопка карт'],
  ['CORE-07', 'GPS и трек'],
  ['CORE-08', 'Поиск'],
  ['CORE-10', 'Тактические знаки'],
  ['CORE-12', 'Рельеф и профиль'],
  ['CORE-13', 'Линейка'],
  ['CORE-16', 'Обмен обстановкой'],
];

export const PRESETS: ReadonlyArray<{ id: string; name: string; off: readonly FeatureId[] }> = [
  { id: 'full', name: 'Полный набор', off: [] },
  { id: 'observer', name: 'Наблюдатель', off: ['CORE-04', 'CORE-05', 'CORE-16'] },
  {
    id: 'map',
    name: 'Только карта',
    off: ['CORE-04', 'CORE-05', 'CORE-07', 'CORE-10', 'CORE-12', 'CORE-16'],
  },
];

export const isOn = (off: readonly string[], id: FeatureId): boolean => !off.includes(id);

/** Выключенные на устройстве функции — задаёт приложение из настроек. */
export const featuresOff = signal<readonly string[]>([]);
export const featureOn = (id: FeatureId): boolean => isOn(featuresOff.value, id);
