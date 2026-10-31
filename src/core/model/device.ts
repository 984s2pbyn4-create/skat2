/** Класс устройства: от него зависит набор доступных режимов и раскладка интерфейса. */
export type DeviceClass = 'phone' | 'tablet' | 'desktop';

/** Признаки среды, по которым определяется класс устройства. */
export interface DeviceTraits {
  /** Основной указатель — палец (coarse) или мышь (fine). */
  readonly coarsePointer: boolean;
  /** Меньшая сторона экрана, CSS-пиксели. */
  readonly shortSide: number;
}

/** Палец и короткая сторона < 600 px — телефон; палец — планшет; мышь — ПК. */
export function classifyDevice(t: DeviceTraits): DeviceClass {
  if (!t.coarsePointer) return 'desktop';
  return t.shortSide < 600 ? 'phone' : 'tablet';
}
