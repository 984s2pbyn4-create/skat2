import { useEffect, useState } from 'preact/hooks';
import { checkTemplate } from '@core/model/basemap';
import type { CustomMap, MapView } from '@core/model/mapView';
import { Button } from '@kit/ui/Button';
import { Sheet } from '@kit/ui/Sheet';
import { BASEMAPS } from './basemaps';
import { tiles } from './engine';
import { ExtraLayers } from './ExtraLayers';
import { layers } from './layersState';
import { featureOn } from '@kit/feature/profiles';
import type maplibregl from 'maplibre-gl';

interface Props {
  readonly view: MapView;
  readonly onChange: (patch: Partial<MapView>) => void;
  readonly onDownload: () => void;
  readonly map: maplibregl.Map;
  readonly onAdjust: (id: string) => void;
  readonly onClose: () => void;
}

/** Подложки (свои — по адресу), сетка, режим без сети, кэш тайлов. */
export function LayersSheet({ view, map, onChange, onDownload, onAdjust, onClose }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [maxZoom, setMaxZoom] = useState(19);
  const [dark, setDark] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    tiles.count().then(setCount, () => setCount(null));
  }, []);

  const clear = async () => {
    if (!confirm('Удалить все сохранённые тайлы?')) return;
    await tiles.clear();
    setCount(0);
  };
  const add = () => {
    const err = checkTemplate(url.trim()) ?? (name.trim() ? null : 'Введите название');
    setError(err ?? '');
    if (err) return;
    const m: CustomMap = {
      id: `u_${Date.now().toString(36)}`,
      name: name.trim(),
      url: url.trim(),
      maxZoom,
      dark,
    };
    onChange({ custom: [...view.custom, m], basemap: m.id });
    setName('');
    setUrl('');
    setAdding(false);
  };
  const remove = (id: string) => {
    if (!confirm('Удалить эту карту из списка?')) return;
    onChange({
      custom: view.custom.filter((c) => c.id !== id),
      ...(view.basemap === id ? { basemap: 'osm' } : {}),
    });
  };
  const radio = (id: string, label: string) => (
    <label key={id} class="k-opt">
      <input
        type="radio"
        name="basemap"
        checked={view.basemap === id}
        onChange={() => onChange({ basemap: id })}
      />
      {label}
    </label>
  );

  return (
    <Sheet title="Слои" onClose={onClose}>
      <section class="k-section">
        <h2>Подложка</h2>
        {BASEMAPS.map((b) => radio(b.id, b.name))}
        {layers.value.local.map((m) => radio(m.id, `Файл: ${m.name}`))}
        {view.custom.map((c) => (
          <div key={c.id} class="k-row">
            {radio(c.id, c.name)}
            <Button variant="ghost" onClick={() => remove(c.id)}>
              Удалить
            </Button>
          </div>
        ))}
      </section>
      <ExtraLayers
        map={map}
        basemap={view.basemap}
        onBasemap={(id) => onChange({ basemap: id })}
        onAdjust={onAdjust}
      />
      <section class="k-section">
        <h2>Своя карта</h2>
        <p class="k-muted">
          Подключение сервера карт, которого нет в списке (например, внутреннего). Нужен шаблон адреса тайла:{' '}
          {'{z}'} — масштаб, {'{x}'} и {'{y}'} — номер тайла. Пример: https://a.tile.opentopomap.org/
          {'{z}/{x}/{y}'}.png. Некоторые серверы не отдают карту браузеру — тогда она не загрузится.
        </p>
        {!adding ? (
          <Button onClick={() => setAdding(true)}>Добавить свою карту…</Button>
        ) : (
          <div class="m-add">
            <input
              type="text"
              placeholder="Название, например «Топо штаба»"
              value={name}
              onInput={(e) => setName(e.currentTarget.value)}
            />
            <input
              type="url"
              placeholder="https://сервер/{z}/{x}/{y}.png"
              value={url}
              onInput={(e) => setUrl(e.currentTarget.value)}
            />
            <div class="k-row">
              Макс. масштаб
              <input
                class="k-field"
                type="number"
                min={1}
                max={22}
                value={maxZoom}
                onInput={(e) => setMaxZoom(Math.min(22, Math.max(1, Number(e.currentTarget.value) || 19)))}
              />
              <label class="k-opt">
                <input type="checkbox" checked={dark} onChange={(e) => setDark(e.currentTarget.checked)} />
                Тёмная (спутник) — сетка будет светлой
              </label>
            </div>
            <p class="k-muted">
              Также понимает {'{-y}'} (TMS), {'{q}'} (Bing) и {'{s}'} (поддомен).
            </p>
            {error && <p class="k-note">{error}</p>}
            <div class="k-row">
              <Button variant="primary" onClick={add}>
                Добавить
              </Button>
              <Button onClick={() => setAdding(false)}>Отмена</Button>
            </div>
          </div>
        )}
      </section>
      <section class="k-section">
        <h2>Наложения</h2>
        <label class="k-opt">
          <input
            type="checkbox"
            checked={view.grid}
            onChange={(e) => onChange({ grid: e.currentTarget.checked })}
          />
          Километровая сетка СК-42
        </label>
        {featureOn('CORE-12') && (
          <label class="k-opt">
            <input
              type="checkbox"
              checked={view.hillshade}
              onChange={(e) => onChange({ hillshade: e.currentTarget.checked })}
            />
            Отмывка рельефа
          </label>
        )}
        <label class="k-opt">
          <input
            type="checkbox"
            checked={view.places}
            onChange={(e) => onChange({ places: e.currentTarget.checked })}
          />
          Скачанные названия населённых пунктов
        </label>
      </section>
      <section class="k-section">
        <h2>Офлайн</h2>
        <label class="k-opt">
          <input
            type="checkbox"
            checked={view.offline}
            onChange={(e) => onChange({ offline: e.currentTarget.checked })}
          />
          Без сети: только сохранённые тайлы
        </label>
        <p class="k-muted">Сохранено тайлов: {count ?? '…'}</p>
        <div class="k-row">
          {featureOn('CORE-03') && <Button onClick={onDownload}>Загрузки…</Button>}
          <Button onClick={() => void clear()}>Очистить</Button>
        </div>
      </section>
    </Sheet>
  );
}
