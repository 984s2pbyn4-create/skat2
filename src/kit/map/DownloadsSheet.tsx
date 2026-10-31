import { useEffect, useState } from 'preact/hooks';
import type maplibregl from 'maplibre-gl';
import { countTiles, type Bounds } from '@core/geo/tiles';
import { layerProgress, newLayer, type DownloadArea, type DownloadLayer } from '@core/model/downloads';
import type { Basemap } from '@core/model/basemap';
import { Button } from '@kit/ui/Button';
import { Sheet } from '@kit/ui/Sheet';
import { storageUsage } from '@platform/storage/db';
import { DEM } from '@platform/tiles/elevation';
import { basemapById } from './basemaps';
import { addArea, addLayers, areas, pause, removeArea, resume } from './downloads';

const LIMIT = 60_000;
const KB: Record<DownloadLayer['kind'], number> = { tiles: 20, dem: 90, places: 0 };
const fmt = (n: number) => n.toLocaleString('ru-RU');
const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} МБ`;
const STATE: Record<DownloadLayer['state'], string> = {
  queued: 'в очереди',
  running: 'загрузка',
  paused: 'пауза',
  done: 'готово',
  error: 'ошибка',
};

interface Props {
  readonly map: maplibregl.Map;
  readonly basemap: Basemap;
  readonly offline: boolean;
  readonly onClose: () => void;
}

function layerTitle(l: DownloadLayer): string {
  if (l.kind === 'places') return 'Названия н. п.';
  if (l.kind === 'dem') return `Высоты, уровни ${l.z0}–${l.z1}`;
  return `${basemapById(l.source).name}, уровни ${l.z0}–${l.z1}`;
}

/** Форма нового участка или докачки слоёв в существующий. */
function NewLayers({
  bounds,
  basemap,
  map,
  area,
  onDone,
}: {
  readonly bounds: Bounds;
  readonly basemap: Basemap;
  readonly map: maplibregl.Map;
  readonly area: DownloadArea | null;
  readonly onDone: () => void;
}) {
  const zNow = Math.min(basemap.maxZoom, Math.max(1, Math.round(map.getZoom()) + 1));
  const [name, setName] = useState(`Участок ${areas.value.length + 1}`);
  const [useMap, setUseMap] = useState(true);
  const [z0, setZ0] = useState(Math.max(1, zNow - 2));
  const [z1, setZ1] = useState(Math.min(basemap.maxZoom, zNow + 2));
  const [useDem, setUseDem] = useState(true);
  const [d1, setD1] = useState(13);
  const [usePlaces, setUsePlaces] = useState(!area?.layers.some((l) => l.kind === 'places'));
  const mapCount = useMap ? countTiles(bounds, z0, z1, basemap.ellipsoidal) : 0;
  const demCount = useDem ? countTiles(bounds, 10, d1) : 0;
  const total = mapCount + demCount;
  const size = Math.max(1, Math.round((mapCount * KB.tiles + demCount * KB.dem) / 1024));
  const num = (v: number, set: (n: number) => void, min: number, max: number) => (
    <input
      class="k-field"
      type="number"
      min={min}
      max={max}
      value={v}
      onInput={(e) => set(Math.min(max, Math.max(min, Number(e.currentTarget.value) || min)))}
    />
  );
  const start = () => {
    const layers: DownloadLayer[] = [];
    if (useMap) layers.push(newLayer('tiles', basemap.id, Boolean(basemap.ellipsoidal), z0, z1, mapCount));
    if (useDem) layers.push(newLayer('dem', DEM.id, false, 10, d1, demCount));
    if (usePlaces) layers.push(newLayer('places', 'overpass', false, 0, 0, 1));
    if (!layers.length) return;
    if (area) addLayers(area.id, layers);
    else addArea(name.trim() || 'Участок', bounds, layers);
    onDone();
  };
  return (
    <section class="k-section">
      <h2>{area ? `Докачать: ${area.name}` : 'Новый участок — видимая область'}</h2>
      {!area && (
        <div class="m-add">
          <input type="text" value={name} onInput={(e) => setName(e.currentTarget.value)} />
        </div>
      )}
      <label class="k-opt">
        <input type="checkbox" checked={useMap} onChange={(e) => setUseMap(e.currentTarget.checked)} />
        Карта: {basemap.name}
      </label>
      {useMap && (
        <div class="k-row">
          уровни {num(z0, (v) => setZ0(Math.min(v, z1)), 1, basemap.maxZoom)} –{' '}
          {num(z1, (v) => setZ1(Math.max(v, z0)), 1, basemap.maxZoom)}
          <span class="k-muted">{fmt(mapCount)} тайлов</span>
        </div>
      )}
      <label class="k-opt">
        <input type="checkbox" checked={useDem} onChange={(e) => setUseDem(e.currentTarget.checked)} />
        Высоты
      </label>
      {useDem && (
        <div class="k-row">
          уровни 10 – {num(d1, setD1, 10, 15)}
          <span class="k-muted">{fmt(demCount)} тайлов</span>
        </div>
      )}
      <label class="k-opt">
        <input type="checkbox" checked={usePlaces} onChange={(e) => setUsePlaces(e.currentTarget.checked)} />
        Названия населённых пунктов (OpenStreetMap)
      </label>
      <p class="k-muted">
        Всего {fmt(total)} тайлов, около {size} МБ.
      </p>
      {total > LIMIT && <p class="k-note">Больше {fmt(LIMIT)} тайлов: уменьшите участок или уровни.</p>}
      <div class="k-row">
        <Button
          variant="primary"
          disabled={total > LIMIT || (!useMap && !useDem && !usePlaces)}
          onClick={start}
        >
          {area ? 'Докачать' : 'Скачать'}
        </Button>
        {area && <Button onClick={onDone}>Отмена</Button>}
      </div>
    </section>
  );
}

/** Загрузки: новый участок, ход загрузки, пауза и продолжение, список скачанного. */
export function DownloadsSheet({ map, basemap, offline, onClose }: Props) {
  const [extend, setExtend] = useState<DownloadArea | null>(null);
  const [usage, setUsage] = useState('…');
  useEffect(() => {
    storageUsage().then(setUsage, () => setUsage('нет данных'));
  }, [areas.value.length]);
  const b = map.getBounds();
  const view: Bounds = { w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() };

  const remove = async (a: DownloadArea) => {
    if (!confirm(`Удалить участок «${a.name}» и его данные?`)) return;
    await removeArea(a.id);
  };

  return (
    <Sheet title="Загрузки" onClose={onClose}>
      {offline && <p class="k-note">Включён режим «Без сети»: загрузка стоит на паузе.</p>}
      {extend ? (
        <NewLayers
          bounds={extend.bounds}
          basemap={basemap}
          map={map}
          area={extend}
          onDone={() => setExtend(null)}
        />
      ) : (
        <NewLayers
          key={areas.value.length}
          bounds={view}
          basemap={basemap}
          map={map}
          area={null}
          onDone={() => undefined}
        />
      )}
      <section class="k-section">
        <h2>Скачано</h2>
        <p class="k-muted">Занято на устройстве: {usage}</p>
        {areas.value.length === 0 && <p class="k-muted">Пока ничего не скачано.</p>}
        {areas.value.map((a) => (
          <div key={a.id} class="m-area">
            <div class="k-row">
              <b>{a.name}</b>
              <span class="k-muted">{new Date(a.created).toLocaleDateString('ru-RU')}</span>
            </div>
            {a.layers.map((l, i) => (
              <div key={i} class="m-job">
                <div class="k-row">
                  <span>{layerTitle(l)}</span>
                  <span class="k-muted">
                    {STATE[l.state]}
                    {l.kind !== 'places'
                      ? ` · ${fmt(l.cursor)} из ${fmt(l.total)}`
                      : l.ok
                        ? ` · ${fmt(l.ok)} назв.`
                        : ''}{' '}
                    · {mb(l.bytes)}
                  </span>
                </div>
                {l.kind !== 'places' && (
                  <div class="m-bar">
                    <i style={{ width: `${layerProgress(l)}%` }} />
                  </div>
                )}
                {l.error && <p class="k-pin-msg err">{l.error}</p>}
                <div class="k-row">
                  {(l.state === 'running' || l.state === 'queued') && (
                    <Button onClick={() => pause(a.id, i)}>Пауза</Button>
                  )}
                  {(l.state === 'paused' || l.state === 'error') && (
                    <Button onClick={() => resume(a.id, i)}>Продолжить</Button>
                  )}
                </div>
              </div>
            ))}
            <div class="k-row">
              <Button
                onClick={() => {
                  map.fitBounds(
                    [
                      [a.bounds.w, a.bounds.s],
                      [a.bounds.e, a.bounds.n],
                    ],
                    { padding: 20 },
                  );
                  onClose();
                }}
              >
                Показать
              </Button>
              <Button onClick={() => setExtend(a)}>Докачать</Button>
              <Button onClick={() => void remove(a)}>Удалить</Button>
            </div>
          </div>
        ))}
      </section>
    </Sheet>
  );
}

/** Общий ход активных загрузок, % — для кнопки на карте. null — ничего не качается. */
export function activeProgress(list: readonly DownloadArea[]): number | null {
  let done = 0;
  let total = 0;
  for (const a of list) {
    for (const l of a.layers) {
      if (l.state !== 'running' && l.state !== 'queued') continue;
      done += l.cursor;
      total += l.total || 1;
    }
  }
  return total ? Math.round((done / total) * 100) : null;
}
