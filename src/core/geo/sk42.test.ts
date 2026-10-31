import { describe, expect, it } from 'vitest';
import { fromSK, krsToWgs, toSK, wgsToKrs, zoneOf } from './sk42';

/** Эталоны посчитаны кодом СКАТ 6.64 — перенос не должен их менять. */
const REF = [
  { name: 'Москва', lat: 55.7558, lon: 37.6173, x: 6182341.067, y: 7413305.557, zone: 7 },
  { name: 'Санкт-Петербург', lat: 59.9386, lon: 30.3141, x: 6650392.468, y: 6350000.114, zone: 6 },
  { name: 'Новосибирск', lat: 55.0302, lon: 82.9204, x: 6102319.111, y: 14622833.513, zone: 14 },
  { name: 'у границы зон 7/8', lat: 54.5, lon: 41.999, x: 6045807.638, y: 8305710.22, zone: 8 },
] as const;

describe('СК-42', () => {
  it.each(REF)('совпадает с 6.x: $name', (r) => {
    const p = toSK(r.lat, r.lon);
    expect(p.zone).toBe(r.zone);
    expect(Math.abs(p.x - r.x)).toBeLessThan(0.001);
    expect(Math.abs(p.y - r.y)).toBeLessThan(0.001);
  });

  it('туда-обратно с ошибкой меньше 1 см', () => {
    for (let lat = 42; lat <= 70; lat += 4) {
      for (let lon = 20; lon <= 170; lon += 7.5) {
        const p = toSK(lat, lon);
        const [la, lo] = fromSK(p.x, p.y);
        const dy = (la - lat) * 111320;
        const dx = (lo - lon) * 111320 * Math.cos((lat * Math.PI) / 180);
        expect(Math.hypot(dx, dy)).toBeLessThan(0.01);
      }
    }
  });

  it('явная зона даёт координаты в соседней зоне', () => {
    const p = toSK(55.75, 41.9, 7);
    expect(p.zone).toBe(7);
    const [la, lo] = fromSK(p.x, p.y, 7);
    expect(la).toBeCloseTo(55.75, 6);
    expect(lo).toBeCloseTo(41.9, 6);
  });

  it('эллипсоиды: прямое и обратное преобразование согласованы', () => {
    const [bl, ll] = wgsToKrs(55.75, 37.62);
    const [la, lo] = krsToWgs(bl, ll);
    expect(la).toBeCloseTo(55.75, 7);
    expect(lo).toBeCloseTo(37.62, 7);
  });

  it('номер зоны по долготе', () => {
    expect(zoneOf(0)).toBe(1);
    expect(zoneOf(37.6)).toBe(7);
    expect(zoneOf(-3)).toBe(60);
    expect(zoneOf(365)).toBe(1);
  });
});
