import { defineFeature } from '@kit/feature/define';

/** Функции ядра карты, общие для режимов (docs/FEATURES.md). */
export const CORE_01 = defineFeature({ id: 'CORE-01', title: 'Сетка СК-42, пересчёт СК-42 / WGS-84 / МГРС' });
export const CORE_02 = defineFeature({ id: 'CORE-02', title: 'Подложки онлайн: топо, спутник' });
export const CORE_03 = defineFeature({
  id: 'CORE-03',
  title: 'Офлайн-кэш и загрузка участков',
  requires: ['CORE-02'],
});
export const CORE_06 = defineFeature({ id: 'CORE-06', title: 'Поворот карты, компас' });

export const MAP_CORE = [CORE_01, CORE_02, CORE_03, CORE_06] as const;
