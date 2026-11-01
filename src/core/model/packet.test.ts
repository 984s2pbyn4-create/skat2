import { describe, expect, it } from 'vitest';
import { objectsToPacket, packetToObjects, parsePacket } from './packet';
import type { MapObject } from './objects';

const base = { side: 'r' as const, rot: 0, size: 1, label: '12101', note: '' };
const objs: MapObject[] = [
  { ...base, id: 'a', sym: 'pu', kind: 'point', coords: [[37.6, 49.3]] },
  {
    ...base,
    id: 'b',
    sym: 'z_rub_obor',
    kind: 'line',
    coords: [
      [37.6, 49.3],
      [37.7, 49.31],
    ],
  },
  {
    ...base,
    id: 'c',
    sym: 'a_mine',
    kind: 'area',
    side: 'b',
    coords: [
      [37.6, 49.3],
      [37.7, 49.3],
      [37.7, 49.4],
    ],
  },
];

describe('пакет обмена', () => {
  it('туда-обратно через JSON', () => {
    const p = objectsToPacket(objs, { mode: 'combat', project: 'combat', at: 1 }, 'Обстановка');
    const back = packetToObjects(
      parsePacket(JSON.parse(JSON.stringify(p))),
      (() => {
        let i = 0;
        return () => `n${i++}`;
      })(),
    );
    expect(back.map((o) => [o.id, o.kind, o.sym, o.side, o.coords.length])).toEqual([
      ['n0', 'point', 'pu', 'r', 1],
      ['n1', 'line', 'z_rub_obor', 'r', 2],
      ['n2', 'area', 'a_mine', 'b', 3],
    ]);
    expect(back[0]?.label).toBe('12101');
  });
  it('чужой файл — понятная ошибка', () => {
    expect(() => parsePacket({ v: 2 })).toThrow('пакетом обмена');
  });
});

describe('пакет обмена: устойчивость', () => {
  it('объекты без знака и неизвестные геометрии пропускаются, значения по умолчанию', () => {
    const p = parsePacket({
      v: 1,
      id: 'x',
      from: { mode: 'shtab', project: 's', at: 0 },
      title: 't',
      layers: [
        {
          name: 'l',
          features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: {} },
            {
              type: 'Feature',
              geometry: { type: 'MultiPoint', coordinates: [[1, 2]] },
              properties: { sym: 'pu' },
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [1, 2] },
              properties: { sym: 'pu', side: 'b', label: 5 },
            },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: null },
          ],
        },
      ],
    });
    const o = packetToObjects(p, () => 'n');
    expect(o).toHaveLength(1);
    expect(o[0]).toMatchObject({ side: 'b', label: '', rot: 0, size: 1, note: '' });
  });
});
