import { useEffect, useRef, useState } from 'preact/hooks';
import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { planGrid, pxPerKm, skGrid } from '@core/geo/grid';
import { toSK } from '@core/geo/sk42';
import type { MapView } from '@core/model/mapView';
import { Button } from '@kit/ui/Button';
import { detectDevice } from '@platform/device/detect';
import { basemapById, registerCustom } from './basemaps';
import { elevation } from '@platform/tiles/elevation';
import { CoordBar } from './CoordBar';
import { DownloadsSheet, activeProgress } from './DownloadsSheet';
import { areas, initDownloads, loadPlaces, placesVersion } from './downloads';
import { EMPTY_FC, buildStyle, registerSkatProtocol, setBasemap, setPlaces, tiles } from './engine';
import { watchHeading } from './heading';
import { LayersSheet } from './LayersSheet';
import { loadMapView, saveMapView } from './persist';

interface Props {
  readonly title: string;
  readonly onExit: () => void;
}

const touch = detectDevice() !== 'desktop';

function updateGrid(map: maplibregl.Map, on: boolean): void {
  const src = map.getSource('grid') as GeoJSONSource | undefined;
  if (!src) return;
  const c = map.getCenter();
  const plan = on ? planGrid(pxPerKm(map.getZoom(), c.lat)) : null;
  if (!plan) {
    src.setData(EMPTY_FC);
    return;
  }
  const b = map.getBounds();
  const features = skGrid(
    { w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() },
    toSK(c.lat, c.lng).zone,
    plan,
  );
  src.setData({ type: 'FeatureCollection', features });
}

/** Рабочее поле с картой: подложки, сетка СК-42, координаты, компас, офлайн-участки. */
export function MapWorkspace({ title, onExit }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const [view, setView] = useState<MapView | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [sheet, setSheet] = useState<'layers' | 'downloads' | null>(null);
  const [heading, setHeading] = useState<(() => void) | null>(null);
  const [message, setMessage] = useState('');
  const [height, setHeight] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void loadMapView().then((v) => {
      if (!alive) return;
      viewRef.current = v;
      registerCustom(v.custom);
      setView(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = (patch: Partial<MapView>) => {
    const cur = viewRef.current;
    if (!cur) return;
    const next = { ...cur, ...patch };
    viewRef.current = next;
    setView(next);
    void saveMapView(next);
  };

  useEffect(() => {
    const v = viewRef.current;
    if (!v || !box.current) return;
    registerSkatProtocol();
    tiles.offline = v.offline;
    tiles.onFailing = (b) =>
      setMessage(`${b.name}: тайлы не загружаются. Проверьте сеть или выберите другую подложку.`);
    const m = new maplibregl.Map({
      container: box.current,
      style: buildStyle(basemapById(v.basemap)),
      center: v.center,
      zoom: v.zoom,
      bearing: v.bearing,
      maxPitch: 60,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    let t: ReturnType<typeof setTimeout> | undefined;
    let hSeq = 0;
    const updateHeight = () => {
      const seq = ++hSeq;
      const c = m.getCenter();
      setHeight(undefined);
      void elevation(tiles, c.lat, c.lng).then((h) => seq === hSeq && setHeight(h));
    };
    m.on('moveend', () => {
      updateGrid(m, viewRef.current?.grid ?? false);
      updateHeight();
      clearTimeout(t);
      t = setTimeout(() => {
        const c = m.getCenter();
        update({ center: [c.lng, c.lat], zoom: m.getZoom(), bearing: m.getBearing() });
      }, 500);
    });
    m.on('load', () => {
      updateGrid(m, v.grid);
      updateHeight();
      setMap(m);
      void initDownloads();
    });
    return () => {
      clearTimeout(t);
      m.remove();
      void tiles.flush();
    };
  }, [view === null]);

  useEffect(() => () => heading?.(), [heading]);

  const showPlaces = view?.places ?? true;
  const pv = placesVersion.value;
  useEffect(() => {
    if (!map) return;
    let alive = true;
    void loadPlaces().then((list) => alive && setPlaces(map, showPlaces ? list : []));
    return () => {
      alive = false;
    };
  }, [map, pv, showPlaces]);

  if (!view) return <p class="k-center k-muted">Загрузка карты…</p>;
  const base = basemapById(view.basemap);
  const progress = activeProgress(areas.value);

  const change = (patch: Partial<MapView>) => {
    update(patch);
    if (!map) return;
    if (patch.custom !== undefined) registerCustom(patch.custom);
    if (patch.offline !== undefined) tiles.offline = patch.offline;
    if (patch.basemap !== undefined || patch.offline !== undefined) tiles.resetFailures();
    if (patch.basemap !== undefined || patch.offline !== undefined) {
      setMessage('');
      setBasemap(map, basemapById(patch.basemap ?? view.basemap));
    }
    if (patch.grid !== undefined) updateGrid(map, patch.grid);
  };

  const toggleHeading = async () => {
    if (heading) {
      heading();
      setHeading(null);
      map?.easeTo({ bearing: 0 });
      return;
    }
    try {
      let last = 0;
      const stop = await watchHeading((deg) => {
        const now = performance.now();
        if (!map || now - last < 80) return;
        last = now;
        if (Math.abs(((deg - map.getBearing() + 540) % 360) - 180) > 1) map.jumpTo({ bearing: deg });
      });
      setHeading(() => stop);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div class="m-wrap">
      <div ref={box} class="m-map" />
      <div class="m-cross" aria-hidden="true" />
      <header class="m-top">
        <Button variant="ghost" onClick={onExit}>
          ‹ Режимы
        </Button>
        <h1>{title}</h1>
        <span class="m-spacer" />
        {touch && (
          <Button variant={heading ? 'primary' : 'default'} onClick={() => void toggleHeading()}>
            Компас
          </Button>
        )}
        <Button variant={progress !== null ? 'primary' : 'default'} onClick={() => setSheet('downloads')}>
          {progress !== null ? `Загрузки ${progress} %` : 'Загрузки'}
        </Button>
        <Button onClick={() => setSheet('layers')}>Слои</Button>
      </header>
      {view.offline && <div class="m-badge">Без сети</div>}
      {message && (
        <button type="button" class="m-msg" onClick={() => setMessage('')}>
          {message}
        </button>
      )}
      {map && (
        <CoordBar map={map} format={view.coords} height={height} onFormat={(coords) => update({ coords })} />
      )}
      {sheet === 'layers' && (
        <LayersSheet
          view={view}
          onChange={change}
          onDownload={() => setSheet('downloads')}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'downloads' && map && (
        <DownloadsSheet map={map} basemap={base} offline={view.offline} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
