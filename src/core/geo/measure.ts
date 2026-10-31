import { toSK } from './sk42';

/** Измерения на эллипсоиде WGS-84 (CORE-13): расстояние, азимут, дирекционный угол, площадь. */
export type LonLat = readonly [lon: number, lat: number];

const A = 6378137;
const F = 1 / 298.257223563;
const B = A * (1 - F);
const D2R = Math.PI / 180;

/** Обратная задача Винсенти: расстояние, м, и прямой азимут, градусы. */
export function inverse(p1: LonLat, p2: LonLat): { m: number; az: number } {
  const L = (p2[0] - p1[0]) * D2R;
  const U1 = Math.atan((1 - F) * Math.tan(p1[1] * D2R));
  const U2 = Math.atan((1 - F) * Math.tan(p2[1] * D2R));
  const sU1 = Math.sin(U1);
  const cU1 = Math.cos(U1);
  const sU2 = Math.sin(U2);
  const cU2 = Math.cos(U2);
  let lambda = L;
  let sinS = 0;
  let cosS = 0;
  let sigma = 0;
  let cos2A = 0;
  let cos2Sm = 0;
  for (let i = 0; i < 200; i++) {
    const sL = Math.sin(lambda);
    const cL = Math.cos(lambda);
    sinS = Math.hypot(cU2 * sL, cU1 * sU2 - sU1 * cU2 * cL);
    if (sinS === 0) return { m: 0, az: 0 };
    cosS = sU1 * sU2 + cU1 * cU2 * cL;
    sigma = Math.atan2(sinS, cosS);
    const sinA = (cU1 * cU2 * sL) / sinS;
    cos2A = 1 - sinA * sinA;
    cos2Sm = cos2A ? cosS - (2 * sU1 * sU2) / cos2A : 0;
    const C = (F / 16) * cos2A * (4 + F * (4 - 3 * cos2A));
    const prev = lambda;
    lambda = L + (1 - C) * F * sinA * (sigma + C * sinS * (cos2Sm + C * cosS * (-1 + 2 * cos2Sm * cos2Sm)));
    if (Math.abs(lambda - prev) < 1e-12) break;
  }
  const u2 = (cos2A * (A * A - B * B)) / (B * B);
  const k1 = 1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
  const k2 = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
  const dS =
    k2 *
    sinS *
    (cos2Sm +
      (k2 / 4) *
        (cosS * (-1 + 2 * cos2Sm * cos2Sm) -
          (k2 / 6) * cos2Sm * (-3 + 4 * sinS * sinS) * (-3 + 4 * cos2Sm * cos2Sm)));
  const m = B * k1 * (sigma - dS);
  const az = Math.atan2(cU2 * Math.sin(lambda), cU1 * sU2 - sU1 * cU2 * Math.cos(lambda)) / D2R;
  return { m, az: (az + 360) % 360 };
}

/** Длина ломаной, м. */
export function pathLength(pts: readonly LonLat[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += inverse(pts[i - 1] as LonLat, pts[i] as LonLat).m;
  return s;
}

/** Площадь многоугольника, м² (сферический избыток на сфере равной площади). */
export function polygonArea(pts: readonly LonLat[]): number {
  if (pts.length < 3) return 0;
  const R = 6371007.2;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i] as LonLat;
    const p2 = pts[(i + 1) % pts.length] as LonLat;
    s += (p2[0] - p1[0]) * D2R * (2 + Math.sin(p1[1] * D2R) + Math.sin(p2[1] * D2R));
  }
  return Math.abs((s * R * R) / 2);
}

/** Дирекционный угол по сетке СК-42 (зона первой точки), градусы. */
export function gridAngle(p1: LonLat, p2: LonLat): number {
  const a = toSK(p1[1], p1[0]);
  const b = toSK(p2[1], p2[0], a.zone);
  return (Math.atan2(b.y - a.y, b.x - a.x) / D2R + 360) % 360;
}

/** Градусы → деления угломера «ДД-ДД» (полный круг 60-00). */
export function toMils(deg: number): string {
  const v = Math.round((((deg % 360) + 360) % 360) * (6000 / 360)) % 6000;
  return `${String(Math.floor(v / 100)).padStart(2, '0')}-${String(v % 100).padStart(2, '0')}`;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} км`;
}

export function formatArea(m2: number): string {
  return m2 < 1e6 ? `${Math.round(m2 / 100) / 100} га` : `${(m2 / 1e6).toFixed(2)} км²`;
}
