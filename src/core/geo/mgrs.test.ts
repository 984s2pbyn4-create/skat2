import { describe, expect, it } from 'vitest';
import { toMgrs, utmZone } from './mgrs';

/** Эталоны — библиотека mgrs 2.x (proj4js). */
const REF: ReadonlyArray<readonly [number, number, string]> = [
  [55.7558, 37.6173, '37U DB 13224 79766'],
  [0, 0, '31N AA 66021 00000'],
  [-33.8688, 151.2093, '56H LH 34368 50948'],
  [60, 5, '32V KM 76979 58157'],
  [78.2, 15.6, '33X WG 13696 80760'],
  [59.9386, 30.3141, '36V UM 49936 47618'],
  [43.1, 131.9, '52T GN 35997 76002'],
];

describe('МГРС', () => {
  it.each(REF)('%f, %f → %s', (lat, lon, mgrs) => {
    expect(toMgrs(lat, lon)).toBe(mgrs);
  });
  it('точность 10 м', () => expect(toMgrs(55.7558, 37.6173, 4)).toBe('37U DB 1322 7976'));
  it('вне диапазона — ошибка', () => expect(() => toMgrs(85, 0)).toThrow(RangeError));
  it('зоны-исключения', () => {
    expect(utmZone(60, 5)).toBe(32);
    expect(utmZone(78, 10)).toBe(33);
    expect(utmZone(78, 5)).toBe(31);
    expect(utmZone(78, 25)).toBe(35);
    expect(utmZone(78, 40)).toBe(37);
  });
});
