import { useEffect, useState } from 'preact/hooks';
import { checkTemplate } from '@core/model/basemap';
import type { CustomMap, MapView } from '@core/model/mapView';
import { Button } from '@kit/ui/Button';
import { Sheet } from '@kit/ui/Sheet';
import { BASEMAPS } from './basemaps';
import { tiles } from './engine';

interface Props {
  readonly view: MapView;
  readonly onChange: (patch: Partial<MapView>) => void;
  readonly onDownload: () => void;
  readonly onClose: () => void;
}

/** Подложки (свои — по адресу), сетка, режим без сети, кэш тайлов. */
export function LayersSheet({ view, onChange, onDownload, onClose }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [maxZoom, setMaxZoom] = useState(19);
  const [dark, setDark] = useState(false);
  const [error, setError] = useState('');
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
        {view.custom.map((c) => (
          <div key={c.id} class="k-row">
            {radio(c.id, c.name)}
            <Button variant="ghost" onClick={() => remove(c.id)}>
              Удалить
            </Button>
          </div>
        ))}
      </section>
      <section class="k-section">
        <h2>Своя карта по адресу</h2>
        <p class="k-muted">
          Шаблон: {'{z} {x} {y}'}, для TMS — {'{-y}'}, для Bing — {'{q}'}, поддомены — {'{s}'}.
        </p>
        <div class="m-add">
          <input
            type="text"
            placeholder="Название"
            value={name}
            onInput={(e) => setName(e.currentTarget.value)}
          />
          <input
            type="url"
            placeholder="https://…/{z}/{x}/{y}.png"
            value={url}
            onInput={(e) => setUrl(e.currentTarget.value)}
          />
          <div class="k-row">
            Макс. уровень
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
              Тёмная (спутник)
            </label>
          </div>
          {error && <p class="k-note">{error}</p>}
          <Button onClick={add}>Добавить карту</Button>
        </div>
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
          <Button onClick={onDownload}>Скачать участок</Button>
          <Button onClick={() => void clear()}>Очистить</Button>
        </div>
      </section>
    </Sheet>
  );
}
