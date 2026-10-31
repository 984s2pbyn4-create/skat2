import type { FeatureManifest } from '@kit/feature/define';
import { MAP_CORE } from '@kit/features/core';

/** Функции режима «Боевой контур», попадающие в сборку. Убрать строку — функции нет в сборке. */
export const features: readonly FeatureManifest[] = [...MAP_CORE];
