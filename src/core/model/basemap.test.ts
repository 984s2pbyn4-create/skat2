import { describe, expect, it } from 'vitest';
import { tileUrl } from './basemap';

describe('адрес тайла', () => {
  it('подставляет z, x, y и поддомен', () => {
    const b = {
      id: 't',
      name: 'T',
      url: 'https://{s}.t/{z}/{x}/{y}.png',
      maxZoom: 17,
      attribution: '',
      subdomains: 'abc',
    };
    expect(tileUrl(b, 3, 1, 1)).toBe('https://c.t/3/1/1.png');
    expect(tileUrl({ ...b, subdomains: undefined }, 3, 1, 2)).toBe('https://.t/3/1/2.png');
  });
});
