import * as z from 'zod/mini';
import { tileRange, type Bounds } from '@core/geo/tiles';

/** Скачанные участки (CORE-03, CORE-09): карта, высоты, названия населённых пунктов. */
export const LAYER_KINDS = ['tiles', 'dem', 'places'] as const;
export type LayerKind = (typeof LAYER_KINDS)[number];
export const JOB_STATES = ['queued', 'running', 'paused', 'done', 'error'] as const;
export type JobState = (typeof JOB_STATES)[number];

const BoundsSchema = z.object({ w: z.number(), s: z.number(), e: z.number(), n: z.number() });
const LayerSchema = z.object({
  kind: z.enum(LAYER_KINDS),
  /** Подложка для kind = tiles. */
  source: z.string(),
  ellipsoidal: z.boolean(),
  z0: z.number(),
  z1: z.number(),
  total: z.number(),
  /** Сколько элементов перебрано: с этого места загрузка продолжается после паузы. */
  cursor: z.number(),
  ok: z.number(),
  bytes: z.number(),
  state: z.enum(JOB_STATES),
  error: z.string(),
});
export type DownloadLayer = z.infer<typeof LayerSchema>;

const AreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.string(),
  bounds: BoundsSchema,
  layers: z.array(LayerSchema),
});
export type DownloadArea = z.infer<typeof AreaSchema>;

export function parseDownloads(raw: unknown): DownloadArea[] {
  const r = z.array(AreaSchema).safeParse(raw);
  return r.success ? r.data : [];
}

export function newLayer(
  kind: LayerKind,
  source: string,
  ellipsoidal: boolean,
  z0: number,
  z1: number,
  total: number,
): DownloadLayer {
  return { kind, source, ellipsoidal, z0, z1, total, cursor: 0, ok: 0, bytes: 0, state: 'queued', error: '' };
}

/** Входит ли тайл (ключ кэша «источник/z/x/y») в слой участка. */
export function coversTile(
  b: Bounds,
  l: DownloadLayer,
  source: string,
  zz: number,
  x: number,
  y: number,
): boolean {
  if (l.kind === 'places' || l.source !== source || zz < l.z0 || zz > l.z1) return false;
  const r = tileRange(b, zz, l.ellipsoidal);
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

export function layerProgress(l: DownloadLayer): number {
  return l.total ? Math.min(100, Math.round((l.cursor / l.total) * 100)) : 0;
}

/** Населённый пункт: имя, широта, долгота, вид (c — город, t — посёлок, v — село, h — хутор, урочище). */
export type Place = readonly [string, number, number, 'c' | 't' | 'v' | 'h'];

const KIND: Record<string, Place[3]> = {
  city: 'c',
  town: 't',
  village: 'v',
  hamlet: 'h',
  isolated_dwelling: 'h',
  locality: 'h',
};

/** Запрос Overpass API: населённые пункты в области. */
export function overpassQuery(b: Bounds): string {
  return `[out:json][timeout:90];node["place"~"^(city|town|village|hamlet|isolated_dwelling|locality)$"](${b.s},${b.w},${b.n},${b.e});out;`;
}

/** Ответ Overpass → компактный список. Имя — русское, если есть. */
export function parsePlaces(json: unknown): Place[] {
  const els = (json as { elements?: unknown } | null)?.elements;
  if (!Array.isArray(els)) throw new Error('Неверный ответ сервера названий');
  const out: Place[] = [];
  for (const e of els as Array<{ lat?: number; lon?: number; tags?: Record<string, string> }>) {
    const t = e.tags ?? {};
    const name = t['name:ru'] ?? t.name;
    const k = KIND[t.place ?? ''];
    if (name && k && typeof e.lat === 'number' && typeof e.lon === 'number')
      out.push([name, e.lat, e.lon, k]);
  }
  return out;
}
