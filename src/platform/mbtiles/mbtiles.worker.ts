/// <reference lib="webworker" />
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

/**
 * Чтение .mbtiles (CORE-04): метаданные и тайлы порциями.
 * Следующая порция — только после «next» от основного потока, чтобы не переполнить память.
 */
const ctx = self as unknown as DedicatedWorkerGlobalScope;
let resume: (() => void) | null = null;
const next = () => new Promise<void>((r) => (resume = r));

function sniff(u: Uint8Array): string {
  if (u[0] === 0x89 && u[1] === 0x50) return 'png';
  if (u[0] === 0xff && u[1] === 0xd8) return 'jpg';
  if (u[0] === 0x52 && u[1] === 0x49) return 'webp';
  if (u[0] === 0x1f && u[1] === 0x8b) return 'pbf';
  return '';
}

ctx.onmessage = async (e: MessageEvent<File | 'next'>) => {
  if (e.data === 'next') {
    resume?.();
    return;
  }
  try {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const db = new SQL.Database(new Uint8Array(await e.data.arrayBuffer()));
    const meta: Record<string, string> = {};
    for (const [k, v] of db.exec('SELECT name, value FROM metadata')[0]?.values ?? [])
      meta[String(k)] = String(v);
    const sample = db.exec('SELECT tile_data FROM tiles LIMIT 1')[0]?.values[0]?.[0];
    meta.format ||= sample instanceof Uint8Array ? sniff(sample) : '';
    const range = db.exec('SELECT MIN(zoom_level), MAX(zoom_level), COUNT(*) FROM tiles')[0]?.values[0] ?? [
      0, 0, 0,
    ];
    ctx.postMessage({
      type: 'meta',
      meta,
      minZoom: Number(range[0]),
      maxZoom: Number(range[1]),
      total: Number(range[2]),
    });
    await next();
    const xyz = meta.scheme === 'xyz';
    const st = db.prepare('SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles');
    let batch: Array<[number, number, number, ArrayBuffer]> = [];
    const send = async () => {
      ctx.postMessage(
        { type: 'batch', batch },
        batch.map((b) => b[3]),
      );
      batch = [];
      await next();
    };
    while (st.step()) {
      const [z, x, y, d] = st.get() as [number, number, number, Uint8Array];
      batch.push([z, x, xyz ? y : (1 << z) - 1 - y, d.slice().buffer]);
      if (batch.length >= 300) await send();
    }
    if (batch.length) await send();
    st.free();
    db.close();
    ctx.postMessage({ type: 'done' });
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
