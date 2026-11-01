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

/** UTM → WGS-84 (обратная задача). */
export function fromUtm(
  zone: number,
  easting: number,
  northing: number,
  south: boolean,
): readonly [lat: number, lon: number] {
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const x = easting - 500000;
  const y = south ? northing - 10_000_000 : northing;
  const m = y / K0;
  const mu = m / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256));
  const p1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu);
  const s = Math.sin(p1);
  const c = Math.cos(p1);
  const t = Math.tan(p1);
  const c1 = EP2 * c * c;
  const t1 = t * t;
  const n1 = A / Math.sqrt(1 - E2 * s * s);
  const r1 = (A * (1 - E2)) / Math.pow(1 - E2 * s * s, 1.5);
  const d = x / (n1 * K0);
  const lat =
    p1 -
    ((n1 * t) / r1) *
      ((d * d) / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * EP2 - 3 * c1 * c1) * d ** 6) / 720);
  const lon =
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d ** 5) / 120) /
    c;
  return [lat / D2R, zone * 6 - 183 + lon / D2R];
}

/** МГРС → WGS-84. Пробелы необязательны: «37U DB 13224 79766», «37UDB1322479766». null — не МГРС. */
export function fromMgrs(text: string): readonly [lat: number, lon: number] | null {
  const m = /^(\d{1,2})([C-HJ-NP-X])\s*([A-HJ-NP-Z])([A-HJ-NP-V])\s*(\d+)\s*(\d*)$/i.exec(
    text.trim().toUpperCase(),
  );
  if (!m) return null;
  const zone = Number(m[1]);
  const band = m[2] as string;
  let digits = (m[5] ?? '') + (m[6] ?? '');
  if (zone < 1 || zone > 60 || digits.length % 2 || digits.length > 10) return null;
  const k = digits.length / 2;
  digits = digits.padEnd(10, '0');
  const set = ((zone - 1) % 6) + 1;
  const col = COLS[(set - 1) % 3]?.indexOf(m[3] as string) ?? -1;
  let row = ROWS.indexOf(m[4] as string);
  if (col < 0 || row < 0) return null;
  if (set % 2 === 0) row = (row - 5 + 20) % 20;
  const half = k ? 10 ** (5 - k) / 2 : 50000;
  const easting = (col + 1) * 1e5 + Number(digits.slice(0, k).padEnd(5, '0')) + half;
  let northing = row * 1e5 + Number(digits.slice(5, 5 + k).padEnd(5, '0')) + half;
  const latMin = (BANDS.indexOf(band) * 8 - 80) as number;
  const south = latMin < 0;
  const minN = toUtm(latMin, zone * 6 - 183).northing - (south ? 0 : 0);
  while (northing < minN - 1e5) northing += 2_000_000;
  return fromUtm(zone, easting, northing, south);
}
