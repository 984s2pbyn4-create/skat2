import type maplibregl from 'maplibre-gl';
import type { MapObject } from '@core/model/objects';
import { Button } from '@kit/ui/Button';
import { symbolById } from './catalog';
import { objects, selected } from './store';

/** Карточка выбранного объекта: сторона, подпись, поворот, размер, перенос, удаление. */
export function ObjectCard({ obj, map }: { readonly obj: MapObject; readonly map: maplibregl.Map }) {
  const s = symbolById(obj.sym);
  const point = obj.kind === 'point';
  const toCenter = () => {
    const c = map.getCenter();
    objects.update(obj.id, { coords: [[c.lng, c.lat]] });
  };
  return (
    <div class="m-tool">
      <div class="k-row">
        <b>{s?.n ?? obj.sym}</b>
      </div>
      <div class="k-row">
        <Button
          variant={obj.side === 'r' ? 'primary' : 'default'}
          onClick={() => objects.update(obj.id, { side: 'r' })}
        >
          Свои
        </Button>
        <Button
          variant={obj.side === 'b' ? 'primary' : 'default'}
          onClick={() => objects.update(obj.id, { side: 'b' })}
        >
          Противник
        </Button>
        <input
          class="k-field m-label"
          type="text"
          placeholder="Подпись"
          value={obj.label}
          onChange={(e) => objects.update(obj.id, { label: e.currentTarget.value })}
        />
      </div>
      <div class="k-row">
        {point && (
          <>
            Поворот
            <input
              class="m-range"
              type="range"
              min={0}
              max={359}
              value={obj.rot}
              onChange={(e) => objects.update(obj.id, { rot: Number(e.currentTarget.value) })}
            />
          </>
        )}
        Размер
        <input
          class="m-range"
          type="range"
          min={0.5}
          max={2.5}
          step={0.1}
          value={obj.size}
          onChange={(e) => objects.update(obj.id, { size: Number(e.currentTarget.value) })}
        />
      </div>
      {point && <p class="k-muted">Выбранный знак можно перетащить по карте.</p>}
      <div class="k-row">
        {point && <Button onClick={toCenter}>В перекрестие</Button>}
        <Button onClick={() => objects.remove(obj.id)}>Удалить</Button>
        <Button onClick={() => (selected.value = null)}>Закрыть</Button>
      </div>
    </div>
  );
}
