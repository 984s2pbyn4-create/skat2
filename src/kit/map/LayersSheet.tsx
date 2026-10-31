import { useEffect, useState } from 'preact/hooks';
import type { MapView } from '@core/model/mapView';
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

/** Подложки, сетка, режим без сети, кэш тайлов. */
export function LayersSheet({ view, onChange, onDownload, onClose }: Props) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    tiles.count().then(setCount, () => setCount(null));
  }, []);
  const clear = async () => {
    if (!confirm('Удалить все сохранённые тайлы?')) return;
    await tiles.clear();
    setCount(0);
  };
  return (
    <Sheet title="Слои" onClose={onClose}>
      <section class="k-section">
        <h2>Подложка</h2>
        {BASEMAPS.map((b) => (
          <label key={b.id} class="k-opt">
            <input
              type="radio"
              name="basemap"
              checked={view.basemap === b.id}
              onChange={() => onChange({ basemap: b.id })}
            />
            {b.name}
          </label>
        ))}
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
