import { signal } from '@preact/signals';
import { eachTile, type Bounds } from '@core/geo/tiles';
import {
  coversTile,
  overpassQuery,
  parseDownloads,
  parsePlaces,
  type DownloadArea,
  type DownloadLayer,
  type Place,
} from '@core/model/downloads';
import type { Basemap } from '@core/model/basemap';
import { dbDeleteMany, dbGet, dbPut } from '@platform/storage/db';
import { DEM } from '@platform/tiles/elevation';
import { basemapById } from './basemaps';
import { tiles } from './engine';

/**
 * Менеджер загрузок: очередь слоёв участков, по одному слою за раз.
 * Ход сохраняется: после паузы или перезапуска загрузка продолжается с места остановки.
 */
export const areas = signal<DownloadArea[]>([]);
/** Номер версии названий — карта перерисовывает подписи, когда он меняется. */
export const placesVersion = signal(0);

const BATCH = 12;
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

let loaded: Promise<void> | null = null;
let current: { area: string; idx: number; stop: boolean } | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function save(now = false): void {
  if (saveTimer) clearTimeout(saveTimer);
  const run = () => {
    saveTimer = null;
    void dbPut('settings', 'downloads', areas.value).catch((e: unknown) =>
      console.warn('Загрузки не сохранены:', e),
    );
  };
  if (now) run();
  else saveTimer = setTimeout(run, 1000);
}

function patch(areaId: string, idx: number, p: Partial<DownloadLayer>, now = false): void {
  areas.value = areas.value.map((a) =>
    a.id !== areaId ? a : { ...a, layers: a.layers.map((l, i) => (i === idx ? { ...l, ...p } : l)) },
  );
  save(now);
}

export function initDownloads(): Promise<void> {
  loaded ??= (async () => {
    areas.value = parseDownloads(await dbGet('settings', 'downloads').catch(() => undefined));
    kick();
  })();
  return loaded;
}

function sourceOf(l: DownloadLayer): Basemap {
  return l.kind === 'dem' ? DEM : basemapById(l.source);
}

function kick(): void {
  if (current) return;
  for (const a of areas.value) {
    const idx = a.layers.findIndex((l) => l.state === 'queued' || l.state === 'running');
    if (idx >= 0) {
      void run(a, idx);
      return;
    }
  }
}

async function run(a: DownloadArea, idx: number): Promise<void> {
  const job = { area: a.id, idx, stop: false };
  current = job;
  const l = a.layers[idx] as DownloadLayer;
  patch(a.id, idx, { state: 'running', error: '' }, true);
  try {
    if (tiles.offline) throw new Error('Включён режим «Без сети»');
    if (l.kind === 'places') await runPlaces(a);
    else await runTiles(a, idx, l, job);
    if (!job.stop)
      patch(a.id, idx, l.kind === 'places' ? { state: 'done', cursor: 1 } : { state: 'done' }, true);
  } catch (e) {
    patch(a.id, idx, { state: 'error', error: e instanceof Error ? e.message : String(e) }, true);
  }
  current = null;
  kick();
}

async function runTiles(a: DownloadArea, idx: number, l: DownloadLayer, job: { stop: boolean }) {
  const b = sourceOf(l);
  const it = eachTile(a.bounds, l.z0, l.z1, l.ellipsoidal);
  for (let i = 0; i < l.cursor; i++) it.next();
  let { cursor, ok, bytes } = l;
  let emptyBatches = 0;
  let last = 0;
  while (!job.stop) {
    const batch: Array<[number, number, number]> = [];
    for (let n = it.next(); !n.done && batch.length < BATCH; n = batch.length < BATCH ? it.next() : n)
      batch.push(n.value);
    if (!batch.length) break;
    const res = await Promise.all(batch.map(([zz, x, y]) => tiles.raw(b, zz, x, y).catch(() => null)));
    const got = res.filter((r): r is ArrayBuffer => r !== null);
    ok += got.length;
    bytes += got.reduce((s, r) => s + r.byteLength, 0);
    cursor += batch.length;
    emptyBatches = got.length ? 0 : emptyBatches + 1;
    if (emptyBatches >= 10) throw new Error('Тайлы не загружаются: проверьте сеть');
    if (tiles.offline) throw new Error('Включён режим «Без сети»');
    const now = performance.now();
    if (now - last > 500) {
      last = now;
      patch(a.id, idx, { cursor, ok, bytes });
    }
  }
  await tiles.flush();
  patch(a.id, idx, { cursor, ok, bytes, ...(job.stop ? { state: 'paused' as const } : {}) }, true);
}

async function runPlaces(a: DownloadArea): Promise<void> {
  let lastErr: unknown = null;
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        body: new URLSearchParams({ data: overpassQuery(a.bounds) }),
      });
      if (!r.ok) throw new Error(`сервер названий ответил ${r.status}`);
      const places = parsePlaces(await r.json());
      await dbPut('assets', `places/${a.id}`, places);
      const idx = a.layers.findIndex((l) => l.kind === 'places');
      patch(a.id, idx, { ok: places.length, bytes: JSON.stringify(places).length, total: 1 });
      placesVersion.value++;
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Сервер названий недоступен');
}

export function addArea(name: string, bounds: Bounds, layers: DownloadLayer[]): void {
  const id = `a_${Date.now().toString(36)}`;
  areas.value = [...areas.value, { id, name, created: new Date().toISOString(), bounds, layers }];
  save(true);
  kick();
}

export function addLayers(areaId: string, layers: DownloadLayer[]): void {
  areas.value = areas.value.map((a) => (a.id === areaId ? { ...a, layers: [...a.layers, ...layers] } : a));
  save(true);
  kick();
}

export function pause(areaId: string, idx: number): void {
  if (current && current.area === areaId && current.idx === idx) current.stop = true;
  else patch(areaId, idx, { state: 'paused' }, true);
}

export function resume(areaId: string, idx: number): void {
  patch(areaId, idx, { state: 'queued', error: '' }, true);
  kick();
}

/** Удалить участок: его тайлы (кроме нужных другим участкам), высоты и названия. */
export async function removeArea(areaId: string): Promise<void> {
  if (current?.area === areaId) {
    current.stop = true;
    while (current?.area === areaId) await new Promise((r) => setTimeout(r, 100));
  }
  const area = areas.value.find((a) => a.id === areaId);
  if (!area) return;
  const others = areas.value.filter((a) => a.id !== areaId);
  const keys: string[] = [];
  for (const l of area.layers) {
    if (l.kind === 'places') continue;
    const src = sourceOf(l).id;
    for (const [zz, x, y] of eachTile(area.bounds, l.z0, l.z1, l.ellipsoidal)) {
      const shared = others.some((o) =>
        o.layers.some((ol) => coversTile(o.bounds, { ...ol, source: sourceOf(ol).id }, src, zz, x, y)),
      );
      if (!shared) keys.push(`${src}/${zz}/${x}/${y}`);
    }
  }
  for (let i = 0; i < keys.length; i += 2000) await dbDeleteMany('tiles', keys.slice(i, i + 2000));
  await dbDeleteMany('assets', [`places/${areaId}`]);
  areas.value = others;
  save(true);
  placesVersion.value++;
}

/** Все скачанные названия — для слоя подписей на карте. */
export async function loadPlaces(): Promise<Place[]> {
  const out: Place[] = [];
  for (const a of areas.value) {
    const p = await dbGet('assets', `places/${a.id}`).catch(() => undefined);
    if (Array.isArray(p)) out.push(...(p as Place[]));
  }
  return out;
}
