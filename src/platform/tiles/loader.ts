import { tileUrl, type Basemap } from '@core/model/basemap';
import { lat3857, y3395 } from '@core/geo/tiles';
import { dbCount, dbGet, dbPutMany, dbReplace } from '@platform/storage/db';

type Canvas = OffscreenCanvas | HTMLCanvasElement;

function canvas256(): Canvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(256, 256);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  return c;
}

function ctx(c: Canvas): OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D {
  const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (!g) throw new Error('Нет 2D-контекста');
  return g;
}

async function toBuffer(c: Canvas, type = 'image/png'): Promise<ArrayBuffer> {
  const blob =
    c instanceof HTMLCanvasElement
      ? await new Promise<Blob | null>((r) => c.toBlob(r, type))
      : await c.convertToBlob({ type });
  if (!blob) throw new Error('Не удалось закодировать тайл');
  return blob.arrayBuffer();
}

const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';

/**
 * Тайлы (CORE-02, CORE-03): кэш IndexedDB → сеть.
 * Яндекс (3395) пересчитывается в 3857 построчно; нет тайла — увеличивается сохранённый родительский
 * (из сети родительские не запрашиваются: это замедляло карту).
 */
export class TileLoader {
  readonly stats = { hit: 0, net: 0, over: 0, miss: 0 };
  /** Только кэш, без сети. */
  offline = false;
  /** Поставщик подряд не отдаёт тайлы — сообщить один раз за сеанс. */
  onFailing: ((b: Basemap) => void) | null = null;
  private readonly fails = new Map<string, number>();
  private readonly reported = new Set<string>();
  private readonly pending = new Map<string, ArrayBuffer>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Тайл поставщика в его собственной сетке. */
  async raw(
    b: Basemap,
    z: number,
    x: number,
    y: number,
    signal?: AbortSignal,
    cachedOnly = false,
  ): Promise<ArrayBuffer | null> {
    const key = `${b.id}/${z}/${x}/${y}`;
    const p = this.pending.get(key);
    if (p) return p.slice(0);
    const cached = await dbGet('tiles', key).catch(() => undefined);
    if (cached instanceof ArrayBuffer) {
      this.stats.hit++;
      return cached;
    }
    if (this.offline || cachedOnly) {
      this.stats.miss++;
      return null;
    }
    let r: Response;
    try {
      r = await fetch(tileUrl(b, z, x, y), { mode: 'cors', signal });
    } catch (e) {
      if (isAbort(e)) throw e;
      this.fail(b);
      return null;
    }
    if (!r.ok) {
      if (r.status !== 404) this.fail(b);
      return null;
    }
    const buf = await r.arrayBuffer();
    if (!buf.byteLength) return null;
    this.fails.set(b.id, 0);
    this.stats.net++;
    this.pending.set(key, buf.slice(0));
    this.timer ??= setTimeout(() => void this.flush(), 700);
    return buf;
  }

  private fail(b: Basemap): void {
    const n = (this.fails.get(b.id) ?? 0) + 1;
    this.fails.set(b.id, n);
    if (n >= 8 && navigator.onLine !== false && !this.reported.has(b.id)) {
      this.reported.add(b.id);
      this.onFailing?.(b);
    }
  }

  /** Тайл в сетке 3857 для карты. cachedOnly — только сохранённые. */
  private async own(b: Basemap, z: number, x: number, y: number, signal?: AbortSignal, cachedOnly = false) {
    return b.ellipsoidal
      ? this.compose3395(b, z, x, y, signal, cachedOnly)
      : this.raw(b, z, x, y, signal, cachedOnly);
  }

  async get(
    b: Basemap,
    z: number,
    x: number,
    y: number,
    signal?: AbortSignal,
    depth = 0,
  ): Promise<ArrayBuffer | null> {
    const own = await this.own(b, z, x, y, signal, depth > 0);
    if (own || depth >= 6 || z === 0) return own;
    const parent = await this.get(b, z - 1, x >> 1, y >> 1, signal, depth + 1);
    if (!parent) return null;
    this.stats.over++;
    const img = await createImageBitmap(new Blob([parent]));
    const c = canvas256();
    ctx(c).drawImage(img, (x & 1) * 128, (y & 1) * 128, 128, 128, 0, 0, 256, 256);
    img.close();
    return toBuffer(c);
  }

  private async compose3395(
    b: Basemap,
    z: number,
    x: number,
    y: number,
    signal?: AbortSignal,
    cachedOnly = false,
  ) {
    const n = 2 ** z;
    const world = 256 * n;
    const ys: number[] = [];
    for (let r = 0; r < 256; r++) ys.push(y3395(lat3857(y * 256 + r + 0.5, world), world));
    const t0 = Math.max(0, Math.floor((ys[0] ?? 0) / 256));
    const t1 = Math.min(n - 1, Math.floor((ys[255] ?? 0) / 256));
    const rows: number[] = [];
    for (let t = t0; t <= t1; t++) rows.push(t);
    const bufs = await Promise.all(rows.map((t) => this.raw(b, z, x, t, signal, cachedOnly)));
    if (bufs.some((v) => !v)) return null;
    const imgs = new Map<number, ImageBitmap>();
    for (let i = 0; i < rows.length; i++)
      imgs.set(rows[i] as number, await createImageBitmap(new Blob([bufs[i] as ArrayBuffer])));
    const c = canvas256();
    const g = ctx(c);
    ys.forEach((sy, r) => {
      const t = Math.floor(sy / 256);
      const img = imgs.get(t);
      if (img) g.drawImage(img, 0, Math.min(255, Math.floor(sy - t * 256)), 256, 1, 0, r, 256, 1);
    });
    imgs.forEach((i) => i.close());
    return toBuffer(c, b.id.endsWith('sat') ? 'image/jpeg' : 'image/png');
  }

  async flush(): Promise<void> {
    this.timer = null;
    const items = [...this.pending];
    if (!items.length) return;
    try {
      await dbPutMany('tiles', items);
    } catch (e) {
      console.warn('Кэш тайлов:', e);
    }
    for (const [k] of items) this.pending.delete(k);
  }

  async count(): Promise<number> {
    await this.flush();
    return dbCount('tiles');
  }

  async clear(): Promise<void> {
    this.pending.clear();
    await dbReplace('tiles', []);
  }

  /** Сбросить счётчики сбоев (после смены подложки или режима сети). */
  resetFailures(): void {
    this.fails.clear();
    this.reported.clear();
  }
}
