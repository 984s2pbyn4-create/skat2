import { describe, expect, it } from 'vitest';
import { analyzeProfile, samplePath } from './profile';

describe('профиль и видимость', () => {
  it('точки вдоль пути, расстояния растут', () => {
    const r = samplePath(
      [
        [37.6, 49.3],
        [37.62, 49.3],
        [37.62, 49.32],
      ],
      21,
    );
    expect(r.pts.length).toBe(21);
    expect(r.dist[0]).toBe(0);
    expect(r.dist[20]).toBeGreaterThan(3500);
    expect(r.pts[20]?.[1]).toBeCloseTo(49.32, 6);
  });
  it('гора между точками закрывает видимость', () => {
    const d = [0, 500, 1000, 1500, 2000];
    expect(analyzeProfile(d, [100, 100, 100, 100, 100]).visible).toBe(true);
    const r = analyzeProfile(d, [100, 110, 160, 110, 100]);
    expect(r.visible).toBe(false);
    expect(r.blockedAt).toBe(500);
    expect(r).toMatchObject({ min: 100, max: 160, ascent: 60, descent: 60 });
  });
  it('кривизна Земли на 30 км закрывает низкую цель', () => {
    const d = Array.from({ length: 31 }, (_, i) => i * 1000);
    expect(
      analyzeProfile(
        d,
        d.map(() => 0),
        2,
        0,
      ).visible,
    ).toBe(false);
    expect(
      analyzeProfile(
        d,
        d.map(() => 0),
        60,
        0,
      ).visible,
    ).toBe(true);
  });
});
