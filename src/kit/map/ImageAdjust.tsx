import { useEffect, useRef, useState } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import type { Overlay } from '@core/model/overlays';
import { Button } from '@kit/ui/Button';
import { moveImage, patchOverlay } from './layersState';

/** Подгонка изображения по углам: четыре перетаскиваемые метки и прозрачность. */
export function ImageAdjust({
  map,
  overlay,
  onDone,
}: {
  readonly map: maplibregl.Map;
  readonly overlay: Overlay;
  readonly onDone: () => void;
}) {
  const corners = useRef<Array<[number, number]>>((overlay.corners ?? []).map((c) => [c[0], c[1]]));
  const [opacity, setOpacity] = useState(overlay.opacity);

  useEffect(() => {
    const markers = corners.current.map((c, i) => {
      const el = document.createElement('div');
      el.className = 'm-corner';
      const m = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(c).addTo(map);
      m.on('drag', () => {
        const p = m.getLngLat();
        corners.current[i] = [p.lng, p.lat];
        moveImage(map, overlay, corners.current);
      });
      m.on('dragend', () => patchOverlay(overlay.id, { corners: corners.current.map((v) => [v[0], v[1]]) }));
      return m;
    });
    return () => markers.forEach((m) => m.remove());
  }, [map, overlay.id]);

  return (
    <div class="m-tool">
      <div class="k-row">
        <b>Подгонка: {overlay.name}</b>
      </div>
      <p class="k-muted">Перетащите углы изображения на известные точки карты.</p>
      <div class="k-row">
        Прозрачность
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={opacity}
          onInput={(e) => {
            const v = Number(e.currentTarget.value);
            setOpacity(v);
            map.setPaintProperty(`ov-${overlay.id}-i`, 'raster-opacity', v);
          }}
          onChange={() => patchOverlay(overlay.id, { opacity })}
        />
        <Button variant="primary" onClick={onDone}>
          Готово
        </Button>
      </div>
    </div>
  );
}
