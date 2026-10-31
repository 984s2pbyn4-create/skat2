/**
 * Пересчёт координат WGS-84 ↔ СК-42 (эллипсоид Красовского, проекция Гаусса–Крюгера, зоны по 6°).
 * Формулы перенесены из СКАТ 6.x без изменений; совпадение подтверждается тестами (sk42.test.ts).
 */

/** Прямоугольные координаты СК-42: x — на север, y — на восток с номером зоны впереди (как на топокартах). */
export interface SkPoint {
  readonly x: number;
  readonly y: number;
  readonly zone: number;
}

/** Широта и долгота в градусах. */
export type LatLon = readonly [lat: number, lon: number];

interface Ellipsoid {
  readonly a: number;
  readonly e2: number;
  readonly ep2: number;
}
type Vec3 = readonly [number, number, number];

const D2R = Math.PI / 180;
const S2R = Math.PI / (180 * 3600);

function ellipsoid(a: number, f: number): Ellipsoid {
  const e2 = f * (2 - f);
  return { a, e2, ep2: e2 / (1 - e2) };
}

const WGS = ellipsoid(6378137, 1 / 298.257223563);
const KRS = ellipsoid(6378245, 1 / 298.3);

/** Семь параметров преобразования WGS-84 → СК-42 (как в 6.x). */
const T = { dx: 23.57, dy: -140.95, dz: -79.8, rx: 0, ry: 0.35 * S2R, rz: 0.79 * S2R, s: -0.22e-6 } as const;

function toEcef(lat: number, lon: number, h: number, e: Ellipsoid): Vec3 {
  const p = lat * D2R;
  const l = lon * D2R;
  const sp = Math.sin(p);
  const n = e.a / Math.sqrt(1 - e.e2 * sp * sp);
  return [
    (n + h) * Math.cos(p) * Math.cos(l),
    (n + h) * Math.cos(p) * Math.sin(l),
    (n * (1 - e.e2) + h) * sp,
  ];
}

function fromEcef(x: number, y: number, z: number, e: Ellipsoid): Vec3 {
  const p = Math.hypot(x, y);
  const lon = Math.atan2(y, x);
  let lat = Math.atan2(z, p * (1 - e.e2));
  let h = 0;
  for (let i = 0; i < 6; i++) {
    const s = Math.sin(lat);
    const n = e.a / Math.sqrt(1 - e.e2 * s * s);
    h = p / Math.cos(lat) - n;
    lat = Math.atan2(z, p * (1 - (e.e2 * n) / (n + h)));
  }
  return [lat / D2R, lon / D2R, h];
}

/** Геодезические WGS-84 → геодезические на эллипсоиде Красовского. */
export function wgsToKrs(lat: number, lon: number): LatLon {
  const [x0, y0, z0] = toEcef(lat, lon, 0, WGS);
  const k = 1 + T.s;
  const x = (x0 - T.dx) / k;
  const y = (y0 - T.dy) / k;
  const z = (z0 - T.dz) / k;
  const [la, lo] = fromEcef(x + T.rz * y - T.ry * z, -T.rz * x + y + T.rx * z, T.ry * x - T.rx * y + z, KRS);
  return [la, lo];
}

/** Геодезические на эллипсоиде Красовского → WGS-84. */
export function krsToWgs(lat: number, lon: number): LatLon {
  const [x, y, z] = toEcef(lat, lon, 0, KRS);
  const k = 1 + T.s;
  const [la, lo] = fromEcef(
    T.dx + k * (x - T.rz * y + T.ry * z),
    T.dy + k * (T.rz * x + y - T.rx * z),
    T.dz + k * (-T.ry * x + T.rx * y + z),
    WGS,
  );
  return [la, lo];
}

const { a, e2, ep2 } = KRS;
const e4 = e2 * e2;
const e6 = e4 * e2;
const M0 = 1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256;
const M2 = (3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024;
const M4 = (15 * e4) / 256 + (45 * e6) / 1024;
const M6 = (35 * e6) / 3072;
const E1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

/** Гаусс–Крюгер вперёд: [север, восток от осевого меридиана], м. */
function tmForward(lat: number, lon: number, l0: number): readonly [number, number] {
  const p = lat * D2R;
  const sp = Math.sin(p);
  const cp = Math.cos(p);
  const tp = Math.tan(p);
  const n = a / Math.sqrt(1 - e2 * sp * sp);
  const t = tp * tp;
  const c = ep2 * cp * cp;
  const A = (lon - l0) * D2R * cp;
  const m = a * (M0 * p - M2 * Math.sin(2 * p) + M4 * Math.sin(4 * p) - M6 * Math.sin(6 * p));
  const east =
    n * (A + ((1 - t + c) * A ** 3) / 6 + ((5 - 18 * t + t * t + 72 * c - 58 * ep2) * A ** 5) / 120);
  const north =
    m +
    n *
      tp *
      ((A * A) / 2 +
        ((5 - t + 9 * c + 4 * c * c) * A ** 4) / 24 +
        ((61 - 58 * t + t * t + 600 * c - 330 * ep2) * A ** 6) / 720);
  return [north, east];
}

/** Гаусс–Крюгер обратно: [широта, долгота] на эллипсоиде Красовского. */
function tmInverse(north: number, east: number, l0: number): LatLon {
  const mu = north / (a * M0);
  const p1 =
    mu +
    ((3 * E1) / 2 - (27 * E1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * E1 * E1) / 16 - (55 * E1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * E1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * E1 ** 4) / 512) * Math.sin(8 * mu);
  const s = Math.sin(p1);
  const c = Math.cos(p1);
  const t = Math.tan(p1);
  const c1 = ep2 * c * c;
  const t1 = t * t;
  const n1 = a / Math.sqrt(1 - e2 * s * s);
  const r1 = (a * (1 - e2)) / Math.pow(1 - e2 * s * s, 1.5);
  const d = east / n1;
  const lat =
    p1 -
    ((n1 * t) / r1) *
      ((d * d) / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * d ** 6) / 720);
  const lon =
    l0 * D2R +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * d ** 5) / 120) /
      c;
  return [lat / D2R, lon / D2R];
}

/** Номер 6-градусной зоны по долготе. */
export function zoneOf(lon: number): number {
  return Math.floor((((lon % 360) + 360) % 360) / 6) + 1;
}

/** WGS-84 → СК-42. Зона по умолчанию — по долготе точки; можно задать явно (сетка соседней зоны). */
export function toSK(lat: number, lon: number, zone?: number): SkPoint {
  const [bl, ll] = wgsToKrs(lat, lon);
  const z = zone ?? zoneOf(ll);
  const [north, east] = tmForward(bl, ll, 6 * z - 3);
  return { x: north, y: z * 1e6 + 500000 + east, zone: z };
}

/** СК-42 → WGS-84. Зона по умолчанию берётся из старших разрядов y. */
export function fromSK(x: number, y: number, zone?: number): LatLon {
  const z = zone ?? Math.floor(y / 1e6);
  const [bl, ll] = tmInverse(x, y - z * 1e6 - 500000, 6 * z - 3);
  return krsToWgs(bl, ll);
}
