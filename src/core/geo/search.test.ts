import { describe, expect, it } from 'vitest';
import { parseCoords } from './search';
import { toSK } from './sk42';

const C = { lat: 49.3539, lon: 37.622 }; // X 54 70 000, Y 74 00 000

const sk = (h: { lat: number; lon: number } | undefined) => (h ? toSK(h.lat, h.lon) : { x: 0, y: 0 });

describe('поиск по координатам', () => {
  it('СК-42 полные — с метками и без', () => {
    for (const q of ['X 54 71 250 Y 74 02 500', 'х 5471250 у 7402500', '5471250 7402500']) {
      const p = sk(parseCoords(q, C)[0]);
      expect(Math.abs(p.x - 5471250)).toBeLessThan(1);
      expect(Math.abs(p.y - 7402500)).toBeLessThan(1);
    }
  });
  it('СК-42 сокращённые — в стокилометровом квадрате карты', () => {
    const p = sk(parseCoords('X 71 250 Y 02 500', C)[0]);
    expect(Math.abs(p.x - 5471250)).toBeLessThan(1);
    expect(Math.abs(p.y - 7402500)).toBeLessThan(1);
    expect(Math.abs(sk(parseCoords('71250 02500', C)[0]).x - 5471250)).toBeLessThan(1);
  });
  it('квадрат XXYY — центр ближайшего', () => {
    const h = parseCoords('7102', C)[0];
    expect(h?.label).toBe('Квадрат 7102');
    const p = sk(h);
    expect(Math.abs(p.x - 5471500)).toBeLessThan(1);
    expect(Math.abs(p.y - 7402500)).toBeLessThan(1);
  });
  it('WGS-84 и МГРС', () => {
    expect(parseCoords('49.35, 37.62', C)[0]).toMatchObject({ lat: 49.35, lon: 37.62 });
    expect(parseCoords('49,35 37,62', C)[0]).toMatchObject({ lat: 49.35, lon: 37.62 });
    const m = parseCoords('37U DB 13224 79766', C)[0];
    expect(m?.lat).toBeCloseTo(55.7558, 4);
    expect(parseCoords('Змиёв', C)).toEqual([]);
  });
});

describe('поиск: границы', () => {
  it('без меток — 14 и 15 цифр; вне зон — пусто; пустая строка', () => {
    expect(parseCoords('54712507402500', C)).toHaveLength(1);
    expect(parseCoords('547125014622834', C)[0]?.label).toContain('СК-42');
    expect(parseCoords('1000000 7402500', C)).toEqual([]);
    expect(parseCoords('   ', C)).toEqual([]);
    expect(parseCoords('95.5 37.6', C)).toEqual([]);
  });
});
