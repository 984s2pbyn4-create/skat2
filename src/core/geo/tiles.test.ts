import { describe, expect, it } from 'vitest';
import { countTiles, eachTile, lat3857, latToTileY, lonToTileX, y3395 } from './tiles';

describe('тайлы', () => {
  it('номера тайлов 3857', () => {
    expect(lonToTileX(37.6173, 10)).toBe(619);
    expect(latToTileY(55.7558, 10)).toBe(320);
    expect(lonToTileX(180, 3)).toBe(7);
    expect(latToTileY(-90, 3)).toBe(7);
  });
  it('Яндекс (3395) смещён к югу примерно на 20 км у Москвы', () => {
    const world = 256 * 2 ** 12;
    const phi = (55.75 * Math.PI) / 180;
    const y57 = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * world;
    expect(y3395(phi, world) - y57).toBeCloseTo(924.9, 0);
    expect((lat3857(y57, world) * 180) / Math.PI).toBeCloseTo(55.75, 6);
    expect(latToTileY(55.75, 12, true)).toBeGreaterThan(latToTileY(55.75, 12));
  });
  it('подсчёт и перебор совпадают', () => {
    const b = { w: 37.5, s: 55.7, e: 37.7, n: 55.8 };
    const all = [...eachTile(b, 10, 13)];
    expect(all.length).toBe(countTiles(b, 10, 13));
    expect([...eachTile(b, 12, 12, true)].length).toBe(countTiles(b, 12, 12, true));
  });
});
