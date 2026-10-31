/** Подложка карты (CORE-02). */
export interface Basemap {
  readonly id: string;
  readonly name: string;
  /**
   * Шаблон адреса тайла: {z} {x} {y} — XYZ; {-y} — TMS (ось y снизу);
   * {q} — квадключ Bing; {s} — поддомен из subdomains.
   */
  readonly url: string;
  readonly maxZoom: number;
  readonly attribution: string;
  /** Эллипсоидная Меркатор (3395, Яндекс) — пересчитывается в 3857. */
  readonly ellipsoidal?: boolean;
  readonly subdomains?: string;
  /** Тёмная подложка (спутник): сетка и подписи рисуются светлыми. */
  readonly dark?: boolean;
}

/** Квадключ Bing для тайла. */
export function quadkey(z: number, x: number, y: number): string {
  let q = '';
  for (let i = z; i > 0; i--) {
    const m = 1 << (i - 1);
    q += String((x & m ? 1 : 0) + (y & m ? 2 : 0));
  }
  return q;
}

export function tileUrl(b: Basemap, z: number, x: number, y: number): string {
  const s = b.subdomains ? (b.subdomains[(x + y) % b.subdomains.length] ?? '') : '';
  return b.url
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{-y}', String(2 ** z - 1 - y))
    .replace('{y}', String(y))
    .replace('{q}', quadkey(z, x, y))
    .replace('{s}', s);
}

/** Проверка шаблона своей карты: нужен https и {z}/{x}/{y} либо {q}. */
export function checkTemplate(url: string): string | null {
  if (!/^https:\/\//.test(url)) return 'Адрес должен начинаться с https://';
  if (url.includes('{q}')) return null;
  if (!url.includes('{z}') || !url.includes('{x}') || !(url.includes('{y}') || url.includes('{-y}'))) {
    return 'В адресе нужны {z}, {x} и {y} (или {-y}, {q})';
  }
  return null;
}
