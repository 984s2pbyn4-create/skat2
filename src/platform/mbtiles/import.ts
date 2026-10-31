import type { LocalMap } from '@core/model/overlays';
import { dbDeleteRange, dbPutMany } from '@platform/storage/db';

type Msg =
  | { type: 'meta'; meta: Record<string, string>; minZoom: number; maxZoom: number; total: number }
  | { type: 'batch'; batch: Array<[number, number, number, ArrayBuffer]> }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** Импорт .mbtiles в кэш тайлов устройства: после импорта файл не нужен, карта работает без сети. */
export function importMbtiles(
  file: File,
  id: string,
  onProgress: (done: number, total: number) => void,
): Promise<LocalMap> {
  const w = new Worker(new URL('./mbtiles.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    let info: LocalMap | null = null;
    let done = 0;
    const fail = (m: string) => {
      w.terminate();
      void dbDeleteRange('tiles', `${id}/`, `${id}/\uffff`);
      reject(new Error(m));
    };
    w.onmessage = async (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.type === 'meta') {
        if (m.meta.format === 'pbf')
          return fail('Векторные .mbtiles пока не поддерживаются: нужна растровая карта (png, jpg, webp)');
        if (!m.total) return fail('В файле нет тайлов');
        const b = (m.meta.bounds ?? '').split(',').map(Number);
        info = {
          id,
          name: m.meta.name || file.name.replace(/\.mbtiles$/i, ''),
          format: m.meta.format || '?',
          minZoom: m.minZoom,
          maxZoom: m.maxZoom,
          bounds:
            b.length === 4 && b.every(Number.isFinite)
              ? [b[0] as number, b[1] as number, b[2] as number, b[3] as number]
              : null,
          tiles: m.total,
          bytes: 0,
        };
        onProgress(0, m.total);
        w.postMessage('next');
      } else if (m.type === 'batch' && info) {
        try {
          await dbPutMany(
            'tiles',
            m.batch.map(([z, x, y, buf]) => [`${id}/${z}/${x}/${y}`, buf] as const),
          );
        } catch (err) {
          return fail(`Не хватает места на устройстве: ${err instanceof Error ? err.message : String(err)}`);
        }
        done += m.batch.length;
        info.bytes += m.batch.reduce((s, b) => s + b[3].byteLength, 0);
        onProgress(done, info.tiles);
        w.postMessage('next');
      } else if (m.type === 'done' && info) {
        w.terminate();
        resolve(info);
      } else if (m.type === 'error') {
        fail(`Файл не читается: ${m.message}`);
      }
    };
    w.onerror = (e) => fail(e.message || 'Файл не читается');
    w.postMessage(file);
  });
}

export function removeLocalTiles(id: string): Promise<void> {
  return dbDeleteRange('tiles', `${id}/`, `${id}/\uffff`);
}
