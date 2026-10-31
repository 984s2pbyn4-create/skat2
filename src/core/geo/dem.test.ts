import { describe, expect, it } from 'vitest';
import { bilinear, demPixel, terrarium } from './dem';

describe('высоты Terrarium', () => {
  it('декодирование', () => {
    expect(terrarium(128, 0, 0)).toBe(0);
    expect(terrarium(128, 152, 128)).toBe(152.5);
  });
  it('интерполяция между пикселями', () => {
    const rgba = new Uint8ClampedArray(256 * 256 * 4);
    const set = (x: number, y: number, h: number) => {
      const v = h + 32768;
      const o = (y * 256 + x) * 4;
      rgba[o] = Math.floor(v / 256);
      rgba[o + 1] = Math.floor(v % 256);
    };
    set(10, 10, 100);
    set(11, 10, 200);
    set(10, 11, 100);
    set(11, 11, 200);
    expect(bilinear(rgba, 10.5, 10.5)).toBeCloseTo(150, 5);
  });
  it('пиксель внутри тайла', () => {
    const p = demPixel(49.4, 38.9, 15);
    expect(p.fx).toBeGreaterThanOrEqual(0);
    expect(p.fx).toBeLessThan(255);
    expect(Number.isInteger(p.tx)).toBe(true);
  });
});
