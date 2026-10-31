import { toMgrs } from './mgrs';
import { toSK } from './sk42';
import type { CoordFormat } from '@core/model/mapView';

const group = (v: number): string => Math.round(v).toLocaleString('ru-RU').replace(/\s/g, ' ');

/** Координаты точки в выбранном формате для показа и копирования. */
export function formatCoords(lat: number, lon: number, f: CoordFormat): string {
  if (f === 'wgs') return `${lat.toFixed(6)}° ${lon.toFixed(6)}°`;
  if (f === 'mgrs') {
    try {
      return toMgrs(lat, lon);
    } catch {
      return 'МГРС: вне диапазона';
    }
  }
  const p = toSK(lat, lon);
  return `X ${group(p.x)}  Y ${group(p.y)}`;
}

export const COORD_LABEL: Record<CoordFormat, string> = { sk42: 'СК-42', wgs: 'WGS-84', mgrs: 'МГРС' };
