import { describe, expect, it } from 'vitest';
import { formatCoords } from './format';
import { DEFAULT_MAP_VIEW, parseMapView } from '@core/model/mapView';

describe('формат координат', () => {
  it('СК-42, WGS, МГРС', () => {
    expect(formatCoords(55.7558, 37.6173, 'sk42')).toBe('X 6 182 341  Y 7 413 306');
    expect(formatCoords(55.7558, 37.6173, 'wgs')).toBe('55.755800° 37.617300°');
    expect(formatCoords(55.7558, 37.6173, 'mgrs')).toBe('37U DB 13224 79766');
    expect(formatCoords(85, 0, 'mgrs')).toContain('вне диапазона');
  });
  it('состояние карты: проверка и значения по умолчанию', () => {
    expect(parseMapView(undefined)).toEqual(DEFAULT_MAP_VIEW);
    expect(parseMapView({ ...DEFAULT_MAP_VIEW, zoom: 15 }).zoom).toBe(15);
  });
});
