import { describe, expect, it } from 'vitest';
import { planGrid, pxPerKm, skGrid } from './grid';
import { toSK } from './sk42';

const B = { w: 38.8, s: 49.3, e: 39.0, n: 49.42 };

describe('сетка СК-42 (как в 6.x)', () => {
  it('выбор шага по масштабу', () => {
    expect(planGrid(1)).toBeNull();
    expect(planGrid(10)).toEqual({ step: 10000, sub: 0, labels: false });
    expect(planGrid(50)).toEqual({ step: 1000, sub: 0, labels: true });
    expect(planGrid(150)?.sub).toBeCloseTo(333.33, 1);
    expect(pxPerKm(12, 49.4)).toBeGreaterThan(60);
  });
  it('линии на целых километрах, подписи квадратов XXYY', () => {
    const plan = planGrid(60);
    if (!plan) throw new Error('нет плана');
    const f = skGrid(B, 7, plan);
    const line = f.find((x) => x.properties.k && x.geometry.type === 'LineString');
    const c = line?.geometry.type === 'LineString' ? line.geometry.coordinates[5] : undefined;
    const p = toSK(c?.[1] ?? 0, c?.[0] ?? 0, 7);
    const off = Math.min(
      Math.abs(p.x - Math.round(p.x / 1000) * 1000),
      Math.abs(p.y - Math.round(p.y / 1000) * 1000),
    );
    expect(off).toBeLessThan(0.05);
    const labels = f.filter((x) => x.properties.t);
    expect(labels.length).toBeGreaterThan(50);
    expect(labels[0]?.properties.t).toMatch(/^\d{4}$/);
  });
  it('«улитка» — пунктир между километровыми линиями', () => {
    const f = skGrid({ w: 38.9, s: 49.36, e: 38.95, n: 49.39 }, 7, {
      step: 1000,
      sub: 1000 / 3,
      labels: false,
    });
    expect(f.some((x) => x.properties.s)).toBe(true);
  });
  it('граница зоны в области', () => {
    const f = skGrid({ w: 41.9, s: 55, e: 42.1, n: 55.1 }, 7, { step: 1000, sub: 0, labels: false });
    expect(f.filter((x) => x.properties.zb).length).toBe(1);
  });
});
