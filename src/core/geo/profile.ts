import { inverse, type LonLat } from './measure';

/** Профиль местности и прямая видимость (CORE-12). */
export interface ProfileStats {
  readonly min: number;
  readonly max: number;
  readonly ascent: number;
  readonly descent: number;
  /** Прямая видимость с первой точки на последнюю. */
  readonly visible: boolean;
  /** Где луч упирается в рельеф, м от начала (если не видно). */
  readonly blockedAt: number | null;
}

/** n точек вдоль ломаной и расстояния до них от начала, м. */
export function samplePath(pts: readonly LonLat[], n: number): { pts: LonLat[]; dist: number[] } {
  const seg = pts.slice(1).map((p, i) => inverse(pts[i] as LonLat, p).m);
  const total = seg.reduce((a, b) => a + b, 0);
  const out: LonLat[] = [];
  const dist: number[] = [];
  for (let k = 0; k < n; k++) {
    let d = (total * k) / (n - 1);
    dist.push(d);
    let i = 0;
    while (i < seg.length - 1 && d > (seg[i] as number)) d -= seg[i++] as number;
    const a = pts[i] as LonLat;
    const b = (pts[i + 1] ?? a) as LonLat;
    const t = seg[i] ? Math.min(1, d / (seg[i] as number)) : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return { pts: out, dist };
}

/** Кривизна Земли с рефракцией: эффективный радиус 4/3 R. */
const RE = 6_371_000 * (4 / 3);

export function analyzeProfile(
  dist: readonly number[],
  h: readonly number[],
  eye = 2,
  target = 0,
): ProfileStats {
  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < h.length; i++) {
    const d = (h[i] as number) - (h[i - 1] as number);
    if (d > 0) ascent += d;
    else descent -= d;
  }
  const D = dist[dist.length - 1] ?? 0;
  const h0 = (h[0] ?? 0) + eye;
  const h1 = (h[h.length - 1] ?? 0) + target;
  let blockedAt: number | null = null;
  for (let i = 1; i < h.length - 1; i++) {
    const d = dist[i] as number;
    const ray = h0 + ((h1 - h0) * d) / (D || 1);
    const bulge = (d * (D - d)) / (2 * RE);
    if ((h[i] as number) + bulge > ray) {
      blockedAt = d;
      break;
    }
  }
  return {
    min: Math.min(...h),
    max: Math.max(...h),
    ascent,
    descent,
    visible: blockedAt === null,
    blockedAt,
  };
}
