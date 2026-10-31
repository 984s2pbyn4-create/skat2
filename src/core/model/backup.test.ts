import { describe, expect, it } from 'vitest';
import { decodeValue, encodeValue, makeBackup, readBackup } from './backup';
import { fromBase64, toBase64 } from '@core/util/base64';

describe('резервная копия', () => {
  it('двоичные данные переживают JSON', () => {
    const bytes = new Uint8Array([0, 1, 254, 255]);
    const v = { a: [1, 'x', bytes.buffer], b: { c: new Uint8Array([7, 8]) }, d: null };
    const back = decodeValue(JSON.parse(JSON.stringify(encodeValue(v)))) as {
      a: [number, string, ArrayBuffer];
      b: { c: ArrayBuffer };
      d: null;
    };
    expect(new Uint8Array(back.a[2])).toEqual(bytes);
    expect(new Uint8Array(back.b.c)).toEqual(new Uint8Array([7, 8]));
    expect(back.d).toBeNull();
  });
  it('файл копии читается обратно', () => {
    const b = makeBackup('2.0.0', { settings: [['app', { theme: 'red' }]] }, new Date(0));
    const r = readBackup(JSON.stringify(b));
    expect(r.settings).toEqual([['app', { theme: 'red' }]]);
  });
  it('чужой файл — понятная ошибка', () => {
    expect(() => readBackup('{}')).toThrow('резервной копией');
    expect(() => readBackup('не json')).toThrow('резервной копией');
  });
  it('base64 туда и обратно, в том числе большие данные', () => {
    const big = new Uint8Array(100_000).map((_, i) => i % 256);
    expect(fromBase64(toBase64(big))).toEqual(big);
  });
});
