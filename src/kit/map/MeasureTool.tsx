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
import { analyzeProfile, samplePath, type ProfileStats } from '@core/geo/profile';
import { featureOn } from '@kit/feature/profiles';
import { elevation } from '@platform/tiles/elevation';
import { tiles } from './engine';

interface Profile {
  readonly d: number[];
  readonly h: number[];
  readonly st: ProfileStats;
}

/** График профиля: рельеф и луч видимости с первой точки на последнюю. */
function ProfileChart({ p }: { readonly p: Profile }) {
  const W = 320;
  const H = 90;
  const D = p.d[p.d.length - 1] || 1;
  const lo = p.st.min - 5;
  const hi = p.st.max + 5;
  const X = (d: number) => (d / D) * W;
  const Y = (h: number) => H - ((h - lo) / (hi - lo || 1)) * H;
  const terrain = p.d.map((d, i) => `${X(d).toFixed(1)},${Y(p.h[i] ?? lo).toFixed(1)}`).join(' ');
  return (
    <svg class="m-prof" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polygon points={`0,${H} ${terrain} ${W},${H}`} fill="rgba(120,90,40,0.35)" />
      <polyline points={terrain} fill="none" stroke="#c98a2b" stroke-width="1.5" />
      <line
        x1={0}
        y1={Y((p.h[0] ?? 0) + 2)}
        x2={W}
        y2={Y(p.h[p.h.length - 1] ?? 0)}
        stroke={p.st.visible ? '#2ecc71' : '#ff3b30'}
        stroke-dasharray="4 3"
      />
    </svg>
  );
}

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
  const [profile, setProfile] = useState<Profile | 'busy' | null>(null);

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
  useEffect(() => setProfile(null), [pts, area]);
  const buildProfile = async () => {
    setProfile('busy');
    const s = samplePath(pts, 120);
    const h: number[] = [];
    for (const p of s.pts) h.push((await elevation(tiles, p[1], p[0])) ?? Number.NaN);
    if (h.some((v) => !Number.isFinite(v))) {
      setProfile(null);
      alert('Нет данных высот для части пути: нужна сеть или скачанные высоты.');
      return;
    }
    setProfile({ d: s.dist, h, st: analyzeProfile(s.dist, h) });
  };
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
      {profile === 'busy' && <p class="k-muted">Строю профиль…</p>}
      {profile && profile !== 'busy' && (
        <>
          <ProfileChart p={profile} />
          <div class="m-tool-v">
            <div>
              Высоты: {Math.round(profile.st.min)}–{Math.round(profile.st.max)} м · подъём{' '}
              {Math.round(profile.st.ascent)} м · спуск {Math.round(profile.st.descent)} м
            </div>
            <div>
              Видимость с первой точки на последнюю (наблюдатель 2 м):{' '}
              <b>
                {profile.st.visible ? 'есть' : `нет, закрыто на ${formatDistance(profile.st.blockedAt ?? 0)}`}
              </b>
            </div>
          </div>
        </>
      )}
      <div class="k-row">
        <Button onClick={addCenter}>+ в перекрестии</Button>
        <Button disabled={!pts.length} onClick={() => setPts((p) => p.slice(0, -1))}>
          Отменить
        </Button>
        <Button variant={area ? 'primary' : 'default'} onClick={() => setArea((v) => !v)}>
          Площадь
        </Button>
        {featureOn('CORE-12') && !closed && (
          <Button disabled={pts.length < 2 || profile === 'busy'} onClick={() => void buildProfile()}>
            Профиль
          </Button>
        )}
        <Button disabled={!pts.length} onClick={() => setPts([])}>
          Очистить
        </Button>
        <Button onClick={onClose}>Готово</Button>
      </div>
    </div>
  );
}
