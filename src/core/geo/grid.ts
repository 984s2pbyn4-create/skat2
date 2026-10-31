import type { Feature, LineString, Point } from 'geojson';
import { fromSK, toSK, zoneOf } from './sk42';
import type { Bounds } from './tiles';

/** k — линия километровой сетки, s — дополнительная («улитка»), zb — граница зоны, t — подпись квадрата. */
export interface GridProps {
  readonly k?: 1;
  readonly s?: 1;
  readonly zb?: 1;
  readonly t?: string;
}
export type GridFeature = Feature<LineString | Point, GridProps>;

export interface GridPlan {
  readonly step: number;
  /** Шаг дополнительных линий, 0 — без них. */
  readonly sub: number;
  readonly labels: boolean;
}

/** Как в СКАТ 6.x: 1 км, при отдалении 10 км; «улитка» по 333 м и подписи квадратов — на крупном масштабе. */
export function planGrid(pxPerKm: number): GridPlan | null {
  if (pxPerKm * 10 < 16) return null;
  if (pxPerKm < 16) return { step: 10000, sub: 0, labels: false };
  return { step: 1000, sub: pxPerKm >= 140 ? 1000 / 3 : 0, labels: pxPerKm >= 46 };
}

/** Пикселей на километр при данном масштабе карты (MapLibre, тайл 512). */
export function pxPerKm(zoom: number, lat: number): number {
  return 1000 / ((40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom));
}

const pad2 = (km: number): string => String(((Math.round(km) % 100) + 100) % 100).padStart(2, '0');

/** Пределы области в прямоугольных координатах зоны. */
function extent(b: Bounds, zone: number) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 8; j++) {
      const p = toSK(b.s + ((b.n - b.s) * j) / 8, b.w + ((b.e - b.w) * i) / 8, zone);
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }
  }
  return { x0, x1, y0, y1 };
}

/**
 * Сетка СК-42 одной зоны (зоны центра карты) на всю область, как в 6.x.
 * Подписи квадратов: две последние цифры километров X и Y у юго-западного угла квадрата.
 */
export function skGrid(b: Bounds, zone: number, plan: GridPlan, maxLines = 800): GridFeature[] {
  const out: GridFeature[] = [];
  const { x0, x1, y0, y1 } = extent(b, zone);
  const unit = plan.sub || plan.step;
  const nLines = (x1 - x0) / unit + (y1 - y0) / unit;
  const useUnit = nLines > maxLines ? plan.step : unit;
  const N = 24;
  const isMajor = (v: number) => Math.abs(v / plan.step - Math.round(v / plan.step)) < 1e-6;
  const line = (pts: Array<[number, number]>, major: boolean): GridFeature => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: pts },
    properties: major ? { k: 1 } : { s: 1 },
  });
  for (let X = Math.ceil(x0 / useUnit) * useUnit; X <= x1; X += useUnit) {
    const pts: Array<[number, number]> = [];
    for (let k = 0; k <= N; k++) {
      const [la, lo] = fromSK(X, y0 + ((y1 - y0) * k) / N, zone);
      pts.push([lo, la]);
    }
    out.push(line(pts, isMajor(X)));
  }
  for (let Y = Math.ceil(y0 / useUnit) * useUnit; Y <= y1; Y += useUnit) {
    const pts: Array<[number, number]> = [];
    for (let k = 0; k <= N; k++) {
      const [la, lo] = fromSK(x0 + ((x1 - x0) * k) / N, Y, zone);
      pts.push([lo, la]);
    }
    out.push(line(pts, isMajor(Y)));
  }
  if (plan.labels) {
    for (let X = Math.ceil(x0 / 1000) * 1000; X <= x1; X += 1000) {
      for (let Y = Math.ceil(y0 / 1000) * 1000; Y <= y1; Y += 1000) {
        const [la, lo] = fromSK(X, Y, zone);
        if (lo < b.w || lo > b.e || la < b.s || la > b.n) continue;
        out.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lo, la] },
          properties: { t: pad2(X / 1000) + pad2(Y / 1000) },
        });
      }
    }
  }
  for (let m = Math.ceil(b.w / 6) * 6; m < b.e; m += 6) {
    out.push({
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
  return out;
}

export { zoneOf };
