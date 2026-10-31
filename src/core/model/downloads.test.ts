import { describe, expect, it } from 'vitest';
import { coversTile, layerProgress, newLayer, overpassQuery, parseDownloads, parsePlaces } from './downloads';
import { tileRange } from '@core/geo/tiles';

const B = { w: 38.8, s: 49.3, e: 39.0, n: 49.42 };

describe('скачанные участки', () => {
  it('сохранение проверяется схемой', () => {
    const a = {
      id: 'a',
      name: 'Участок 1',
      created: '2026-10-31',
      bounds: B,
      layers: [newLayer('tiles', 'osm', false, 12, 14, 100)],
    };
    expect(parseDownloads([a])).toEqual([a]);
    expect(parseDownloads([{ id: 1 }])).toEqual([]);
    expect(parseDownloads(undefined)).toEqual([]);
  });
  it('принадлежность тайла участку', () => {
    const l = newLayer('tiles', 'osm', false, 12, 14, 0);
    const r = tileRange(B, 13);
    expect(coversTile(B, l, 'osm', 13, r.x0, r.y0)).toBe(true);
    expect(coversTile(B, l, 'osm', 15, r.x0, r.y0)).toBe(false);
    expect(coversTile(B, l, 'esri', 13, r.x0, r.y0)).toBe(false);
    expect(coversTile(B, l, 'osm', 13, r.x1 + 1, r.y0)).toBe(false);
  });
  it('процент выполнения', () => {
    expect(layerProgress({ ...newLayer('dem', 'dem', false, 10, 12, 200), cursor: 50 })).toBe(25);
  });
  it('названия из Overpass: русское имя, вид пункта', () => {
    const p = parsePlaces({
      elements: [
        { lat: 49.6, lon: 36.3, tags: { place: 'town', name: 'Зміїв', 'name:ru': 'Змиёв' } },
        { lat: 49.5, lon: 36.4, tags: { place: 'hamlet', name: 'Хутор' } },
        { lat: 49.5, lon: 36.4, tags: { place: 'suburb', name: 'Район' } },
      ],
    });
    expect(p).toEqual([
      ['Змиёв', 49.6, 36.3, 't'],
      ['Хутор', 49.5, 36.4, 'h'],
    ]);
    expect(() => parsePlaces({})).toThrow();
    expect(overpassQuery(B)).toContain('(49.3,38.8,49.42,39)');
  });
});
