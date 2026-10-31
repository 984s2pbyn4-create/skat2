import { describe, expect, it } from 'vitest';
import { formatCoords, splitSk } from './format';
import { DEFAULT_MAP_VIEW, parseMapView } from '@core/model/mapView';
import { toSK } from './sk42';

describe('формат координат', () => {
  it('членение СК-42: полные и сокращённые', () => {
    expect(splitSk(5470000)).toBe('54 70 000');
    expect(splitSk(7400000)).toBe('74 00 000');
    expect(splitSk(14622834)).toBe('146 22 834');
    expect(splitSk(5470123, true)).toBe('70 123');
  });
  it('СК-42, WGS, МГРС', () => {
    expect(formatCoords(55.7558, 37.6173, 'sk42')).toBe('X 61 82 341  Y 74 13 306');
    expect(formatCoords(55.7558, 37.6173, 'sk42s')).toBe('X 82 341  Y 13 306');
    expect(formatCoords(55.7558, 37.6173, 'wgs')).toBe('55.755800° 37.617300°');
    expect(formatCoords(55.7558, 37.6173, 'mgrs')).toBe('37U DB 13224 79766');
    expect(formatCoords(85, 0, 'mgrs')).toContain('вне диапазона');
  });
  it('карта по умолчанию — в районе X 54 70 000, Y 74 00 000', () => {
    const [lon, lat] = DEFAULT_MAP_VIEW.center;
    const p = toSK(lat, lon);
    expect(Math.abs(p.x - 5470000)).toBeLessThan(1);
    expect(Math.abs(p.y - 7400000)).toBeLessThan(1);
  });
  it('состояние карты: проверка, значения по умолчанию, свои карты', () => {
    expect(parseMapView(undefined)).toEqual(DEFAULT_MAP_VIEW);
    const v = parseMapView({ ...DEFAULT_MAP_VIEW, zoom: 15, custom: undefined });
    expect(v.zoom).toBe(15);
    expect(v.custom).toEqual([]);
    expect(parseMapView({ ...DEFAULT_MAP_VIEW, coords: 'sk42s' }).coords).toBe('sk42s');
  });
});
