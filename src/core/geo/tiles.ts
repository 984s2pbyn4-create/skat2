/** Математика тайлов: веб-Меркатор 3857 и эллипсоидная Меркатор 3395 (Яндекс). */
export const E_WGS = 0.0818191908426215;
const MAX_LAT = 85.05112878;

export interface Bounds {
  readonly w: number;
  readonly s: number;
  readonly e: number;
  readonly n: number;
}

/** Глобальный пиксель y (3395) для широты в радианах при размере мира `world` пикселей. */
export function y3395(phi: number, world: number): number {
  const es = E_WGS * Math.sin(phi);
  const t = Math.tan(Math.PI / 4 + phi / 2) * Math.pow((1 - es) / (1 + es), E_WGS / 2);
  return world * (0.5 - Math.log(t) / (2 * Math.PI));
}

/** Широта (радианы) для глобального пикселя y веб-Меркатора. */
export function lat3857(py: number, world: number): number {
  return Math.atan(Math.sinh(Math.PI * (1 - (2 * py) / world)));
}

const clampTile = (v: number, n: number): number => Math.min(n - 1, Math.max(0, Math.floor(v)));

export function lonToTileX(lon: number, z: number): number {
  const n = 2 ** z;
  return clampTile(((lon + 180) / 360) * n, n);
}

export function latToTileY(lat: number, z: number, ellipsoidal = false): number {
  const n = 2 ** z;
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  const v = ellipsoidal
    ? y3395(phi, 256 * n) / 256
    : ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n;
  return clampTile(v, n);
}

export interface TileRange {
  readonly z: number;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

export function tileRange(b: Bounds, z: number, ellipsoidal = false): TileRange {
  return {
    z,
    x0: lonToTileX(b.w, z),
    x1: lonToTileX(b.e, z),
    y0: latToTileY(b.n, z, ellipsoidal),
    y1: latToTileY(b.s, z, ellipsoidal),
  };
}

/** Число тайлов в области на уровнях z0…z1 включительно. */
export function countTiles(b: Bounds, z0: number, z1: number, ellipsoidal = false): number {
  let c = 0;
  for (let z = z0; z <= z1; z++) {
    const r = tileRange(b, z, ellipsoidal);
    c += (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
  }
  return c;
}

/** Все тайлы области по порядку уровней. */
export function* eachTile(
  b: Bounds,
  z0: number,
  z1: number,
  ellipsoidal = false,
): Generator<[number, number, number]> {
  for (let z = z0; z <= z1; z++) {
    const r = tileRange(b, z, ellipsoidal);
    for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) yield [z, x, y];
  }
}
