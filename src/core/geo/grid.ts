import type { Feature, LineString } from 'geojson';
import { fromSK, toSK, zoneOf } from './sk42';
import type { Bounds } from './tiles';

export interface GridProps {
  /** Подпись километровой линии: две последние цифры километров. */
  readonly k?: string;
  /** Граница зоны. */
  readonly zb?: 1;
}

export interface GridResult {
  readonly features: Array<Feature<LineString, GridProps>>;
  readonly lines: number;
  readonly step: number;
}

const km2 = (v: number): string => String(((Math.round(v / 1000) % 100) + 100) % 100).padStart(2, '0');

/**
 * Километровая сетка СК-42 в пределах области. Линии каждой зоны рисуются только в её долготах.
 * Если линий больше maxLines, шаг удваивается.
 */
export function skGrid(b: Bounds, step: number, maxLines = 500): GridResult {
  const N = 24;
  const zones: Array<{
    z: number;
    lo0: number;
    lo1: number;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  }> = [];
  for (let z = zoneOf(b.w); z <= zoneOf(b.e - 1e-9); z++) {
    const lo0 = Math.max(b.w, 6 * (z - 1));
    const lo1 = Math.min(b.e, 6 * z);
    if (lo1 <= lo0) continue;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j <= 8; j++) {
        const p = toSK(b.s + ((b.n - b.s) * j) / 8, lo0 + ((lo1 - lo0) * i) / 8, z);
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y);
        y1 = Math.max(y1, p.y);
      }
    }
    zones.push({ z, lo0, lo1, x0, x1, y0, y1 });
  }
  let s = step;
  const estimate = (v: number) => zones.reduce((a, o) => a + (o.x1 - o.x0) / v + (o.y1 - o.y0) / v, 0);
  while (estimate(s) > maxLines) s *= 2;

  const features: GridResult['features'] = [];
  let lines = 0;
  for (const o of zones) {
    const push = (pts: Array<[number, number]>, props: GridProps) => {
      let run: Array<[number, number]> = [];
      const flush = () => {
        if (run.length > 1)
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: run },
            properties: props,
          });
        run = [];
      };
      for (const p of pts) {
        if (p[0] >= o.lo0 - 1e-9 && p[0] <= o.lo1 + 1e-9) run.push(p);
        else flush();
      }
      flush();
    };
    for (let X = Math.ceil(o.x0 / s) * s; X <= o.x1; X += s) {
      const pts: Array<[number, number]> = [];
      for (let k = 0; k <= N; k++) {
        const [la, lo] = fromSK(X, o.y0 + ((o.y1 - o.y0) * k) / N, o.z);
        pts.push([lo, la]);
      }
      push(pts, { k: km2(X) });
      lines++;
    }
    for (let Y = Math.ceil(o.y0 / s) * s; Y <= o.y1; Y += s) {
      const pts: Array<[number, number]> = [];
      for (let k = 0; k <= N; k++) {
        const [la, lo] = fromSK(o.x0 + ((o.x1 - o.x0) * k) / N, Y, o.z);
        pts.push([lo, la]);
      }
      push(pts, { k: km2(Y) });
      lines++;
    }
  }
  for (let m = Math.ceil(b.w / 6) * 6; m < b.e; m += 6) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [m, b.s],
          [m, b.n],
        ],
      },
      properties: { zb: 1 },
    });
  }
  return { features, lines, step: s };
}

/** Шаг сетки для масштаба карты: 1 км на крупных масштабах, крупнее при отдалении. */
export function gridStepForZoom(zoom: number): number {
  const raw = 1000 * 2 ** (12 - Math.floor(zoom));
  return [1000, 2000, 5000, 10000, 20000, 50000, 100000].find((v) => v >= raw * 0.9) ?? 100000;
}
