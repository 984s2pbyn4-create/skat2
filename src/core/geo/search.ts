import { fromMgrs } from './mgrs';
import { fromSK, toSK } from './sk42';

/** Разбор строки поиска (CORE-08): координаты СК-42 (полные и сокращённые), квадрат, WGS-84, МГРС. */
export interface CoordHit {
  readonly label: string;
  readonly lat: number;
  readonly lon: number;
}

/** Ближайшее к опорному значение вида base + k·period. */
const nearest = (v: number, ref: number, period: number) => v + Math.round((ref - v) / period) * period;

function sk(x: number, y: number, label: string): CoordHit | null {
  const zone = Math.floor(y / 1e6);
  if (zone < 1 || zone > 60 || x < 3e6 || x > 9e6) return null;
  const [lat, lon] = fromSK(x, y, zone);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { label, lat, lon } : null;
}

export function parseCoords(q: string, center: { lat: number; lon: number }): CoordHit[] {
  const s = q.trim();
  if (!s) return [];
  const out: CoordHit[] = [];

  const mg = fromMgrs(s);
  if (mg) out.push({ label: `МГРС ${s.toUpperCase()}`, lat: mg[0], lon: mg[1] });

  const wgs = /^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/.exec(s);
  if (wgs && /[.,]\d/.test(s)) {
    const lat = Number((wgs[1] as string).replace(',', '.'));
    const lon = Number((wgs[2] as string).replace(',', '.'));
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) out.push({ label: `WGS-84 ${lat}°, ${lon}°`, lat, lon });
  }

  // СК-42 с метками X/Y (Х/У): «X 54 70 000 Y 74 00 000».
  const xy = /[XxХх]\s*([\d\s]+?)\s*[YyУу]\s*([\d\s]+)$/.exec(s);
  const c = toSK(center.lat, center.lon);
  const short = (xs: string, ys: string, label: string) => {
    const x = nearest(Number(xs), c.x, 1e5);
    const y = nearest(Number(ys), c.y, 1e5);
    return sk(x, y, label);
  };
  if (xy) {
    const xs = (xy[1] as string).replace(/\s/g, '');
    const ys = (xy[2] as string).replace(/\s/g, '');
    const h =
      xs.length >= 7 && ys.length >= 7
        ? sk(Number(xs), Number(ys), `СК-42 X ${xs} Y ${ys}`)
        : short(xs, ys, `СК-42 сокр. X ${xs} Y ${ys}`);
    if (h) out.push(h);
    return out;
  }

  const digits = s.replace(/\s/g, '');
  if (/^\d+$/.test(digits)) {
    if (digits.length === 14 || digits.length === 15) {
      const h = sk(
        Number(digits.slice(0, 7)),
        Number(digits.slice(7)),
        `СК-42 X ${digits.slice(0, 7)} Y ${digits.slice(7)}`,
      );
      if (h) out.push(h);
    } else if (digits.length === 10) {
      const h = short(
        digits.slice(0, 5),
        digits.slice(5),
        `СК-42 сокр. X ${digits.slice(0, 5)} Y ${digits.slice(5)}`,
      );
      if (h) out.push(h);
    } else if (digits.length === 4) {
      // Квадрат «XXYY» — центр ближайшего к карте квадрата с такими километрами.
      const x = nearest(Number(digits.slice(0, 2)) * 1000, c.x - 500, 1e5) + 500;
      const y = nearest(Number(digits.slice(2)) * 1000, c.y - 500, 1e5) + 500;
      const [lat, lon] = fromSK(x, y, c.zone);
      out.push({ label: `Квадрат ${digits}`, lat, lon });
    }
  }
  return out;
}
