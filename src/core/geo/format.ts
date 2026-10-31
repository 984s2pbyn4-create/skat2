import { toMgrs } from './mgrs';
import { toSK } from './sk42';
import type { CoordFormat } from '@core/model/mapView';

/** 5470000 → «54 70 000»: старшие разряды, километры, метры — удобно для членения по сетке. */
export function splitSk(v: number, short = false): string {
  const s = String(Math.round(v));
  const km = s.slice(-5, -3);
  const m = s.slice(-3);
  return short ? `${km} ${m}` : `${s.slice(0, -5)} ${km} ${m}`;
}

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
  const short = f === 'sk42s';
  return `X ${splitSk(p.x, short)}  Y ${splitSk(p.y, short)}`;
}

export const COORD_LABEL: Record<CoordFormat, string> = {
  sk42: 'СК-42',
  sk42s: 'СК-42 сокр.',
  wgs: 'WGS-84',
  mgrs: 'МГРС',
};
