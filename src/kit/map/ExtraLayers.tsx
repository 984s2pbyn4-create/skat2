import { useState } from 'preact/hooks';
import type maplibregl from 'maplibre-gl';
import type { Overlay } from '@core/model/overlays';
import { Button } from '@kit/ui/Button';
import { readVectorFile } from '@platform/files/vector';
import { importMbtiles, removeLocalTiles } from '@platform/mbtiles/import';
import { BASEMAPS } from './basemaps';
import { addOverlay, layers, patchOverlay, removeOverlay, setLayers } from './layersState';
import { featureOn } from '@kit/feature/profiles';

const err = (e: unknown) => (e instanceof Error ? e.message : String(e));
const uid = (p: string) => `${p}${Date.now().toString(36)}`;

/** Пустой input type=file, открываемый кнопкой. */
function pick(accept: string, onFile: (f: File) => void): void {
  const i = document.createElement('input');
  i.type = 'file';
  if (accept) i.accept = accept;
  i.onchange = () => {
    const f = i.files?.[0];
    if (f) onFile(f);
  };
  i.click();
}

interface Props {
  readonly map: maplibregl.Map;
  readonly basemap: string;
  readonly onBasemap: (id: string) => void;
  readonly onAdjust: (id: string) => void;
}

/** Стопка карт, наложения (KML, GeoJSON, изображения), свои файлы карт .mbtiles. */
export function ExtraLayers({ map, basemap, onBasemap, onAdjust }: Props) {
  const st = layers.value;
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const addVector = () =>
    pick('', async (f) => {
      try {
        const fc = await readVectorFile(f);
        await addOverlay({ id: uid('v'), name: f.name, kind: 'vector', visible: true, opacity: 1 }, fc);
        setMsg(`Добавлено: ${f.name}, объектов ${fc.features.length}`);
      } catch (e) {
        setMsg(err(e));
      }
    });

  const addImage = () =>
    pick('image/*', async (f) => {
      try {
        const bmp = await createImageBitmap(f);
        const ratio = bmp.height / bmp.width;
        bmp.close();
        const cv = map.getCanvas();
        const w = cv.clientWidth * 0.6;
        const h = Math.min(cv.clientHeight * 0.8, w * ratio);
        const cx = cv.clientWidth / 2;
        const cy = cv.clientHeight / 2;
        const ww = h / ratio;
        const pt = (x: number, y: number): [number, number] => {
          const p = map.unproject([x, y]);
          return [p.lng, p.lat];
        };
        const corners = [
          pt(cx - ww / 2, cy - h / 2),
          pt(cx + ww / 2, cy - h / 2),
          pt(cx + ww / 2, cy + h / 2),
          pt(cx - ww / 2, cy + h / 2),
        ];
        const id = uid('i');
        await addOverlay(
          { id, name: f.name, kind: 'image', visible: true, opacity: 0.7, corners },
          { buf: await f.arrayBuffer(), type: f.type || 'image/png' },
        );
        onAdjust(id);
      } catch (e) {
        setMsg(`Изображение не открылось: ${err(e)}`);
      }
    });

  const addMbtiles = () =>
    pick('', async (f) => {
      const id = uid('mbt_');
      setBusy('Чтение файла…');
      try {
        const info = await importMbtiles(f, id, (done, total) =>
          setBusy(`Импорт: ${done.toLocaleString('ru-RU')} из ${total.toLocaleString('ru-RU')} тайлов`),
        );
        setLayers({ local: [...layers.value.local, info] });
        onBasemap(info.id);
        if (info.bounds)
          map.fitBounds(
            [
              [info.bounds[0], info.bounds[1]],
              [info.bounds[2], info.bounds[3]],
            ],
            { padding: 20, maxZoom: info.maxZoom },
          );
        setMsg(
          `Карта «${info.name}» добавлена: ${info.tiles.toLocaleString('ru-RU')} тайлов, уровни ${info.minZoom}–${info.maxZoom}`,
        );
      } catch (e) {
        setMsg(err(e));
      } finally {
        setBusy('');
      }
    });

  const removeLocal = async (id: string, name: string) => {
    if (!confirm(`Удалить карту «${name}» с устройства?`)) return;
    setBusy(`Удаление «${name}»…`);
    await removeLocalTiles(id);
    setLayers({ local: layers.value.local.filter((m) => m.id !== id) });
    if (basemap === id) onBasemap('osm');
    setBusy('');
  };

  const overlayRow = (o: Overlay) => (
    <div key={o.id} class="m-area">
      <div class="k-row">
        <label class="k-opt">
          <input
            type="checkbox"
            checked={o.visible}
            onChange={(e) => patchOverlay(o.id, { visible: e.currentTarget.checked })}
          />
          {o.name}
        </label>
      </div>
      <div class="k-row">
        <input
          class="m-range"
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={o.opacity}
          onChange={(e) => patchOverlay(o.id, { opacity: Number(e.currentTarget.value) })}
        />
        {o.kind === 'image' && <Button onClick={() => onAdjust(o.id)}>Подогнать</Button>}
        <Button onClick={() => confirm(`Удалить «${o.name}»?`) && void removeOverlay(o.id)}>Удалить</Button>
      </div>
    </div>
  );

  return (
    <>
      {(msg || busy) && (
        <div class="k-section">
          <p class="k-note">{busy || msg}</p>
        </div>
      )}
      {featureOn('CORE-05') && (
        <section class="k-section">
          <h2>Стопка карт</h2>
          <p class="k-muted">Вторая карта поверх основной, с прозрачностью.</p>
          <div class="k-row">
            <select
              class="k-field m-select"
              value={st.stack?.basemap ?? ''}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setLayers({ stack: v ? { basemap: v, opacity: st.stack?.opacity ?? 0.5 } : null });
              }}
            >
              <option value="">Нет</option>
              {BASEMAPS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {st.stack && (
              <input
                class="m-range"
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={st.stack.opacity}
                onChange={(e) =>
                  st.stack && setLayers({ stack: { ...st.stack, opacity: Number(e.currentTarget.value) } })
                }
              />
            )}
          </div>
        </section>
      )}
      {featureOn('CORE-05') && (
        <section class="k-section">
          <h2>Наложения</h2>
          <p class="k-muted">
            KML и GeoJSON — точки, линии, полигоны. Изображение (скан карты, схема) ставится по углам.
          </p>
          <div class="k-row">
            <Button onClick={addVector}>Добавить KML / GeoJSON…</Button>
            <Button onClick={addImage}>Добавить изображение…</Button>
          </div>
          {st.overlays.map(overlayRow)}
        </section>
      )}
      {featureOn('CORE-04') && (
        <section class="k-section">
          <h2>Свои файлы карт (.mbtiles)</h2>
          <p class="k-muted">
            Файл копируется в память устройства и работает без сети. Нужна растровая карта.
          </p>
          <Button disabled={Boolean(busy)} onClick={addMbtiles}>
            Открыть файл .mbtiles…
          </Button>
          {st.local.map((m) => (
            <div key={m.id} class="m-area">
              <div class="k-row">
                <b>{m.name}</b>
                <span class="k-muted">
                  {m.tiles.toLocaleString('ru-RU')} тайлов · уровни {m.minZoom}–{m.maxZoom} ·{' '}
                  {(m.bytes / 1048576).toFixed(1)} МБ
                </span>
              </div>
              <div class="k-row">
                <Button variant={basemap === m.id ? 'primary' : 'default'} onClick={() => onBasemap(m.id)}>
                  {basemap === m.id ? 'Выбрана' : 'Выбрать'}
                </Button>
                <Button disabled={Boolean(busy)} onClick={() => void removeLocal(m.id, m.name)}>
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
