import { describe, expect, it } from 'vitest';
import { missingRequires } from '@kit/feature/define';
import { MODES, findMode } from './modes';

describe('состав сборки', () => {
  it('четыре режима с уникальными id', () => {
    expect(new Set(MODES.map((m) => m.id)).size).toBe(4);
  });
  it('все зависимости функций есть в сборке', () => {
    expect(missingRequires(MODES.flatMap((m) => m.features))).toEqual([]);
  });
  it('поиск режима по id', () => {
    expect(findMode('combat')?.title).toBe('Боевой контур');
    expect(findMode('нет')).toBeUndefined();
  });
});
