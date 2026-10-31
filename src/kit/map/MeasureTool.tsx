import { useEffect, useState } from 'preact/hooks';
import type maplibregl from 'maplibre-gl';
import type { Feature } from 'geojson';
import {
  formatArea,
  formatDistance,
  gridAngle,
  inverse,
  pathLength,
  polygonArea,
  toMils,
  type LonLat,
} from '@core/geo/measure';
import { Button } from '@kit/ui/Button';

const COLOR = '#ffd400';

/** Измерения (CORE-13): точки по касанию или в перекрестии; длина, азимут, дирекционный угол, площадь. */
export function MeasureTool({
  map,
  onClose,
}: {
  readonly map: maplibregl.Map;
  readonly onClose: () => void;
}) {
  const [pts, setPts] = useState<LonLat[]>([]);
  const [area, setArea] = useState(false);

  useEffect(() => {
    map.addSource('measure', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'measure-f',
      type: 'fill',
      source: 'measure',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': COLOR, 'fill-opacity': 0.15 },
    });
    map.addLayer({
      id: 'measure-l',
      type: 'line',
      source: 'measure',
      filter: ['!=', ['geometry-type'], 'Point'],
      paint: { 'line-color': COLOR, 'line-width': 3 },
    });
    map.addLayer({
      id: 'measure-p',
      type: 'circle',
      source: 'measure',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': COLOR,
        'circle-stroke-color': '#000',
        'circle-stroke-width': 1.5,
      },
    });
    const onClick = (e: maplibregl.MapMouseEvent) => setPts((p) => [...p, [e.lngLat.lng, e.lngLat.lat]]);
    map.on('click', onClick);
    map.getCanvas().style.cursor = 'crosshair';
    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
      for (const id of ['measure-p', 'measure-l', 'measure-f']) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource('measure')) map.removeSource('measure');
    };
  }, [map]);

  const closed = area && pts.length >= 3;
  useEffect(() => {
    const f: Feature[] = pts.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [...p] },
      properties: {},
    }));
    if (closed)
      f.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...pts, pts[0] as LonLat].map((p) => [...p])] },
        properties: {},
      });
    else if (pts.length > 1)
      f.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: pts.map((p) => [...p]) },
        properties: {},
      });
    (map.getSource('measure') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: f,
    });
  }, [map, pts, closed]);

  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  const seg = a && b ? inverse(a, b) : null;
  const grid = a && b ? gridAngle(a, b) : 0;
  const total = pathLength(closed ? [...pts, pts[0] as LonLat] : pts);
  const addCenter = () => {
    const c = map.getCenter();
    setPts((p) => [...p, [c.lng, c.lat]]);
  };

  return (
    <div class="m-tool">
      <div class="k-row">
        <b>Измерение</b>
        <span class="k-muted">точек: {pts.length}</span>
      </div>
      {pts.length < 2 ? (
        <p class="k-muted">Нажимайте на карту или ставьте точку в перекрестии.</p>
      ) : (
        <div class="m-tool-v">
          <div>
            {closed ? 'Периметр' : 'Длина'}: <b>{formatDistance(total)}</b>
          </div>
          {closed && (
            <div>
              Площадь: <b>{formatArea(polygonArea(pts))}</b>
            </div>
          )}
          {seg && !closed && (
            <>
              <div>
                Отрезок: <b>{formatDistance(seg.m)}</b>
              </div>
              <div>
                Азимут: <b>{seg.az.toFixed(1)}°</b> ({toMils(seg.az)})
              </div>
              <div>
                Дир. угол: <b>{grid.toFixed(1)}°</b> ({toMils(grid)})
              </div>
            </>
          )}
        </div>
      )}
      <div class="k-row">
        <Button onClick={addCenter}>+ в перекрестии</Button>
        <Button disabled={!pts.length} onClick={() => setPts((p) => p.slice(0, -1))}>
          Отменить
        </Button>
        <Button variant={area ? 'primary' : 'default'} onClick={() => setArea((v) => !v)}>
          Площадь
        </Button>
        <Button disabled={!pts.length} onClick={() => setPts([])}>
          Очистить
        </Button>
        <Button onClick={onClose}>Готово</Button>
      </div>
    </div>
  );
}
