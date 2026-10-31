import type { ComponentType } from 'preact';
import type { DeviceClass } from '@core/model/device';
import type { FeatureManifest } from '@kit/feature/define';

/** Идентификаторы четырёх независимых режимов. */
export type ModeId = 'operator' | 'combat' | 'maket' | 'shtab';

/** Свойства, которые приложение передаёт оболочке режима. */
export interface ModeShellProps {
  /** Вернуться к выбору режима. */
  readonly onExit: () => void;
}

/** Манифест режима: всё, что приложению нужно знать о режиме, не загружая его код. */
export interface ModeManifest {
  readonly id: ModeId;
  readonly title: string;
  readonly summary: string;
  /** На каких устройствах режим доступен. */
  readonly devices: readonly DeviceClass[];
  /** Функции режима из features.config.ts. */
  readonly features: readonly FeatureManifest[];
  /** Ленивая загрузка оболочки — отдельный чанк сборки. */
  readonly load: () => Promise<{ readonly default: ComponentType<ModeShellProps> }>;
}

export function defineMode(m: ModeManifest): ModeManifest {
  return m;
}
