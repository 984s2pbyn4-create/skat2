/** Компас устройства (CORE-06): курс в градусах от севера. Возвращает функцию остановки. */
export async function watchHeading(onHeading: (deg: number) => void): Promise<() => void> {
  const D = window.DeviceOrientationEvent as unknown as
    { requestPermission?: () => Promise<string> } | undefined;
  if (!D) throw new Error('Компас недоступен на этом устройстве');
  if (typeof D.requestPermission === 'function' && (await D.requestPermission()) !== 'granted') {
    throw new Error('Нет разрешения на компас');
  }
  const abs = 'ondeviceorientationabsolute' in window;
  const type = abs ? 'deviceorientationabsolute' : 'deviceorientation';
  const handler = (ev: Event) => {
    const e = ev as DeviceOrientationEvent & { webkitCompassHeading?: number };
    const deg =
      typeof e.webkitCompassHeading === 'number'
        ? e.webkitCompassHeading
        : (abs || e.absolute) && e.alpha !== null
          ? 360 - e.alpha
          : null;
    if (deg !== null) onHeading((deg + (screen.orientation?.angle ?? 0) + 360) % 360);
  };
  addEventListener(type, handler);
  return () => removeEventListener(type, handler);
}
