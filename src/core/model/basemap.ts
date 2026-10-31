/** Подложка карты (CORE-02). */
export interface Basemap {
  readonly id: string;
  readonly name: string;
  /** Шаблон адреса тайла: {z} {x} {y}, {s} — поддомен. */
  readonly url: string;
  readonly maxZoom: number;
  readonly attribution: string;
  /** Эллипсоидная Меркатор (3395, Яндекс) — пересчитывается в 3857. */
  readonly ellipsoidal?: boolean;
  readonly subdomains?: string;
}

export function tileUrl(b: Basemap, z: number, x: number, y: number): string {
  const s = b.subdomains ? (b.subdomains[(x + y) % b.subdomains.length] ?? '') : '';
  return b.url
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{s}', s);
}
