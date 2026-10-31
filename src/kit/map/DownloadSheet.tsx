import { useRef, useState } from 'preact/hooks';
import type maplibregl from 'maplibre-gl';
import { countTiles, eachTile, type Bounds } from '@core/geo/tiles';
import type { Basemap } from '@core/model/basemap';
import { Button } from '@kit/ui/Button';
import { Sheet } from '@kit/ui/Sheet';
import { tiles } from './engine';

const LIMIT = 50_000;
const AVG_KB = 20;

interface Props {
  readonly map: maplibregl.Map;
  readonly basemap: Basemap;
  readonly offline: boolean;
  readonly onClose: () => void;
}

/** Загрузка видимого участка на устройство (CORE-03). */
export function DownloadSheet({ map, basemap, offline, onClose }: Props) {
  const b = map.getBounds();
  const area: Bounds = { w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() };
  const z0 = Math.min(basemap.maxZoom, Math.max(0, Math.round(map.getZoom()) + 1));
  const [z1, setZ1] = useState(Math.min(basemap.maxZoom, z0 + 3));
  const [progress, setProgress] = useState<{ done: number; ok: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);
  const total = countTiles(area, z0, z1, basemap.ellipsoidal);

  const start = async () => {
    stop.current = false;
    setRunning(true);
    const it = eachTile(area, z0, z1, basemap.ellipsoidal);
    let done = 0;
    let ok = 0;
    const worker = async () => {
      for (let n = it.next(); !n.done && !stop.current; n = it.next()) {
        const [z, x, y] = n.value;
        if (await tiles.raw(basemap, z, x, y).catch(() => null)) ok++;
        done++;
        if (done % 10 === 0) setProgress({ done, ok, total });
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    await tiles.flush();
    setProgress({ done, ok, total });
    setRunning(false);
  };

  return (
    <Sheet title="Скачать участок" onClose={() => (running ? undefined : onClose())}>
      <p class="k-muted">
        {basemap.name}, видимая область. Уровни {z0}–{z1}: {total.toLocaleString('ru-RU')} тайлов, около{' '}
        {Math.max(1, Math.round((total * AVG_KB) / 1024))} МБ.
      </p>
      <div class="k-row">
        До уровня
        <input
          class="k-field"
          type="number"
          min={z0}
          max={basemap.maxZoom}
          value={z1}
          disabled={running}
          onInput={(e) => setZ1(Math.min(basemap.maxZoom, Math.max(z0, Number(e.currentTarget.value) || z0)))}
        />
      </div>
      {offline && <p class="k-note">Включён режим «Без сети» — скачивание невозможно.</p>}
      {total > LIMIT && (
        <p class="k-note">Больше {LIMIT.toLocaleString('ru-RU')} тайлов: уменьшите участок или уровень.</p>
      )}
      {progress && (
        <p>
          Готово {progress.done.toLocaleString('ru-RU')} из {progress.total.toLocaleString('ru-RU')},
          сохранено {progress.ok.toLocaleString('ru-RU')}.
        </p>
      )}
      <div class="k-row">
        {running ? (
          <Button onClick={() => (stop.current = true)}>Остановить</Button>
        ) : (
          <Button variant="primary" disabled={offline || total > LIMIT} onClick={() => void start()}>
            Скачать
          </Button>
        )}
      </div>
    </Sheet>
  );
}
