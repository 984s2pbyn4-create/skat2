/** WGS-84 → МГРС (UTM с буквенной сеткой 100 км). Зоны-исключения Норвегии и Шпицбергена учтены. */
const A = 6378137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);
const K0 = 0.9996;
const D2R = Math.PI / 180;
const BANDS = 'CDEFGHJKLMNPQRSTUVWXX';
const COLS = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'] as const;
const ROWS = 'ABCDEFGHJKLMNPQRSTUV';

export interface Utm {
  readonly zone: number;
  readonly easting: number;
  readonly northing: number;
}

export function utmZone(lat: number, lon: number): number {
  const L = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (lat >= 56 && lat < 64 && L >= 3 && L < 12) return 32;
  if (lat >= 72 && lat <= 84 && L >= 0 && L < 42) return L < 9 ? 31 : L < 21 ? 33 : L < 33 ? 35 : 37;
  return Math.min(60, Math.floor((L + 180) / 6) + 1);
}

export function toUtm(lat: number, lon: number): Utm {
  const zone = utmZone(lat, lon);
  const p = lat * D2R;
  const sp = Math.sin(p);
  const cp = Math.cos(p);
  const tp = Math.tan(p);
  const n = A / Math.sqrt(1 - E2 * sp * sp);
  const t = tp * tp;
  const c = EP2 * cp * cp;
  const a = (lon - (zone * 6 - 183)) * D2R * cp;
  const e4 = E2 * E2;
  const e6 = e4 * E2;
  const m =
    A *
    ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * p -
      ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * p) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * p) -
      ((35 * e6) / 3072) * Math.sin(6 * p));
  const easting =
    K0 * n * (a + ((1 - t + c) * a ** 3) / 6 + ((5 - 18 * t + t * t + 72 * c - 58 * EP2) * a ** 5) / 120) +
    500000;
  let northing =
    K0 *
    (m +
      n *
        tp *
        ((a * a) / 2 +
          ((5 - t + 9 * c + 4 * c * c) * a ** 4) / 24 +
          ((61 - 58 * t + t * t + 600 * c - 330 * EP2) * a ** 6) / 720));
  if (lat < 0) northing += 10_000_000;
  return { zone, easting, northing };
}

/** МГРС с точностью digits знаков (5 — 1 м). Пример: «37U DB 13224 79766». */
export function toMgrs(lat: number, lon: number, digits = 5): string {
  if (lat < -80 || lat > 84) throw new RangeError('МГРС: широта вне диапазона −80…84°');
  const { zone, easting, northing } = toUtm(lat, lon);
  const band = BANDS[Math.floor((lat + 80) / 8)] ?? 'X';
  const set = ((zone - 1) % 6) + 1;
  const col = COLS[(set - 1) % 3]?.[Math.floor(easting / 1e5) - 1] ?? '?';
  let row = Math.floor(northing / 1e5) % 20;
  if (set % 2 === 0) row = (row + 5) % 20;
  const div = 10 ** (5 - digits);
  const pad = (v: number) => String(Math.floor((v % 1e5) / div)).padStart(digits, '0');
  return `${zone}${band} ${col}${ROWS[row] ?? '?'} ${pad(easting)} ${pad(northing)}`;
}
