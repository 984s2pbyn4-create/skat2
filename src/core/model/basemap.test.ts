import { describe, expect, it } from 'vitest';
import { checkTemplate, quadkey, tileUrl } from './basemap';

const b = {
  id: 't',
  name: 'T',
  url: 'https://{s}.t/{z}/{x}/{y}.png',
  maxZoom: 17,
  attribution: '',
  subdomains: 'abc',
};

describe('адрес тайла', () => {
  it('XYZ с поддоменом', () => {
    expect(tileUrl(b, 3, 1, 1)).toBe('https://c.t/3/1/1.png');
    expect(tileUrl({ ...b, subdomains: undefined }, 3, 1, 2)).toBe('https://.t/3/1/2.png');
  });
  it('TMS и квадключ Bing', () => {
    expect(tileUrl({ ...b, url: 'https://t/{z}/{x}/{-y}.png' }, 3, 1, 2)).toBe('https://t/3/1/5.png');
    expect(quadkey(3, 3, 5)).toBe('213');
    expect(tileUrl({ ...b, url: 'https://t/a{q}.jpeg' }, 3, 3, 5)).toBe('https://t/a213.jpeg');
  });
  it('проверка шаблона своей карты', () => {
    expect(checkTemplate('https://t/{z}/{x}/{y}.png')).toBeNull();
    expect(checkTemplate('https://t/{q}.png')).toBeNull();
    expect(checkTemplate('http://t/{z}/{x}/{y}.png')).toContain('https');
    expect(checkTemplate('https://t/{z}/{x}.png')).toContain('{y}');
  });
});
