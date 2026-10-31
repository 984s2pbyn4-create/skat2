import { describe, expect, it } from 'vitest';
import { gridStepForZoom, skGrid } from './grid';
import { toSK } from './sk42';

describe('сетка СК-42', () => {
  it('линии лежат на целых километрах', () => {
    const r = skGrid({ w: 37.5, s: 55.7, e: 37.75, n: 55.8 }, 1000);
    expect(r.step).toBe(1000);
    expect(r.lines).toBeGreaterThan(20);
    const f = r.features.find((x) => x.properties.k !== undefined);
    const pos = f?.geometry.coordinates[3] ?? [0, 0];
    const p = toSK(pos[1] ?? 0, pos[0] ?? 0, 7);
    const offX = Math.abs(p.x - Math.round(p.x / 1000) * 1000);
    const offY = Math.abs(p.y - Math.round(p.y / 1000) * 1000);
    expect(Math.min(offX, offY)).toBeLessThan(0.05);
  });
  it('стык зон: граница зоны и линии обеих зон', () => {
    const r = skGrid({ w: 41.5, s: 55, e: 42.5, n: 55.3 }, 2000);
    expect(r.features.filter((f) => f.properties.zb).length).toBe(1);
    const lons = r.features.flatMap((f) =>
      f.properties.k ? f.geometry.coordinates.map((c) => c[0] as number) : [],
    );
    expect(Math.min(...lons)).toBeLessThan(42);
    expect(Math.max(...lons)).toBeGreaterThan(42);
  });
  it('большая область — шаг укрупняется', () => {
    const r = skGrid({ w: 30, s: 50, e: 40, n: 58 }, 1000, 300);
    expect(r.step).toBeGreaterThan(1000);
    expect(r.lines).toBeLessThanOrEqual(600);
  });
  it('шаг по масштабу', () => {
    expect(gridStepForZoom(14)).toBe(1000);
    expect(gridStepForZoom(11.5)).toBe(2000);
    expect(gridStepForZoom(9)).toBe(10000);
  });
});
