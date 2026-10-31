import { describe, expect, it } from 'vitest';
import { formatArea, formatDistance, gridAngle, inverse, pathLength, polygonArea, toMils } from './measure';

describe('измерения', () => {
  it('Винсенти совпадает с GeographicLib: Москва — Санкт-Петербург', () => {
    const r = inverse([37.6173, 55.7558], [30.3141, 59.9386]);
    expect(r.m).toBeCloseTo(635_779.781, 2);
    expect(r.az).toBeCloseTo(320.0976, 3);
    expect(inverse([30, 50], [30, 50]).m).toBe(0);
  });
  it('1° по меридиану на 50° ≈ 111,2 км; азимут на север 0°', () => {
    const r = inverse([30, 50], [30, 51]);
    expect(r.m).toBeCloseTo(111_238.681, 2);
    expect(r.az).toBeCloseTo(0, 6);
    expect(
      pathLength([
        [30, 50],
        [30, 51],
        [30, 52],
      ]),
    ).toBeCloseTo(r.m + inverse([30, 51], [30, 52]).m, 3);
  });
  it('площадь квадрата 1 × 1 км ≈ 100 га', () => {
    const d = 1000 / 111_229;
    const k = 1000 / (111_229 * Math.cos((50 * Math.PI) / 180));
    const a = polygonArea([
      [30, 50],
      [30 + k, 50],
      [30 + k, 50 + d],
      [30, 50 + d],
    ]);
    expect(a / 1e4).toBeGreaterThan(98);
    expect(a / 1e4).toBeLessThan(102);
    expect(
      polygonArea([
        [0, 0],
        [1, 1],
      ]),
    ).toBe(0);
  });
  it('дирекционный угол и деления угломера', () => {
    expect(gridAngle([37.62, 49.35], [37.62, 49.4])).toBeLessThan(5);
    expect(toMils(90)).toBe('15-00');
    expect(toMils(359.99)).toBe('00-00');
    expect(toMils(6)).toBe('01-00');
  });
  it('форматы', () => {
    expect(formatDistance(523.4)).toBe('523 м');
    expect(formatDistance(1534)).toBe('1.53 км');
    expect(formatArea(1_000_000)).toBe('1.00 км²');
    expect(formatArea(25_000)).toBe('2.5 га');
  });
});
