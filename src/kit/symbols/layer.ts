import type maplibregl from 'maplibre-gl';
import type { Feature } from 'geojson';
import type { MapObject, Side } from '@core/model/objects';
import { colorOf, decorLine, specOf, symbolById, symbolImage } from './catalog';

const FONT = ['Noto Sans Medium'];
const EMPTY = { type: 'FeatureCollection' as const, features: [] };

export interface Draft {
  readonly sym: string;
  readonly side: Side;
  readonly coords: ReadonlyArray<readonly [number, number]>;
  readonly area: boolean;
}

export interface ObjectsLayer {
  update(objs: readonly MapObject[], selected: string | null, draft: Draft | null): void;
  /** Объект под точкой экрана (px) или null. */
  hit(x: number, y: number): string | null;
  destroy(): void;
}

/** Масштаб линейных знаков: крупнее при приближении, в разумных пределах. */
const scaleK = (zoom: number) => Math.min(1.4, Math.max(0.55, 2 ** ((zoom - 14) / 3)));

function distToSeg(px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t =
    dx || dy ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function inside(px: number, py: number, P: ReadonlyArray<{ x: number; y: number }>): boolean {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i] as { x: number; y: number };
    const b = P[j] as { x: number; y: number };
    if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/**
 * Обстановка на карте: точечные знаки — слоем MapLibre (спрайты рисуются движком 6.x),
 * линейные и площадные — на прозрачном холсте поверх карты тем же движком.
 */
export function attachObjects(
  map: maplibregl.Map,
  onMove: (id: string, c: [number, number]) => void,
): ObjectsLayer {
  let lines: MapObject[] = [];
  let points: MapObject[] = [];
  let sel: string | null = null;
  let draft: Draft | null = null;

  const onMissing = (e: { id: string }) => {
    const m = /^sym\/(.+)\/([rb])$/.exec(e.id);
    if (!m || map.hasImage(e.id)) return;
    const img = symbolImage(m[1] as string, m[2] as Side);
    if (img) map.addImage(e.id, img, { pixelRatio: 2 });
  };
  map.on('styleimagemissing', onMissing);
  map.addSource('objs-p', { type: 'geojson', data: EMPTY });
  map.addSource('objs-sel', { type: 'geojson', data: EMPTY });
  map.addLayer({
    id: 'objs-sel',
    type: 'circle',
    source: 'objs-sel',
    paint: {
      'circle-radius': 24,
      'circle-color': 'rgba(255,212,0,0.18)',
      'circle-stroke-color': '#ffd400',
      'circle-stroke-width': 2.5,
    },
  });
  map.addLayer({
    id: 'objs-p',
    type: 'symbol',
    source: 'objs-p',
    layout: {
      'icon-image': ['get', 'img'],
      // Выражение zoom допустимо только верхним уровнем: размер знака умножается внутри.
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8,
        ['*', 0.6, ['get', 'size']],
        14,
        ['*', 1, ['get', 'size']],
        18,
        ['*', 1.5, ['get', 'size']],
      ],
      'icon-rotate': ['get', 'rot'],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ['get', 'label'],
      'text-font': FONT,
      'text-size': 12,
      'text-offset': [0, 1.7],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: { 'text-color': '#111111', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 },
  });

  const box = map.getContainer();
  const cv = document.createElement('canvas');
  cv.className = 'm-objs';
  box.insertBefore(cv, box.querySelector('.maplibregl-control-container'));
  const g = cv.getContext('2d') as CanvasRenderingContext2D;

  const screen = (cs: ReadonlyArray<readonly [number, number]>) =>
    cs.map((c) => {
      const p = map.project([c[0], c[1]]);
      return { x: p.x, y: p.y };
    });

  const drawOne = (
    sym: string,
    side: Side,
    cs: ReadonlyArray<readonly [number, number]>,
    area: boolean,
    k: number,
    halo: boolean,
  ) => {
    const s = symbolById(sym);
    if (!s || cs.length < 2) return;
    const P = screen(cs);
    if (area && P.length > 2) P.push({ ...(P[0] as { x: number; y: number }) });
    if (halo) {
      g.save();
      g.strokeStyle = 'rgba(255,212,0,0.55)';
      g.lineWidth = 14;
      g.lineJoin = 'round';
      g.beginPath();
      P.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
      g.stroke();
      g.restore();
    }
    decorLine(g, P, colorOf(sym, side), k, specOf(s));
  };

  const draw = () => {
    const w = box.clientWidth;
    const h = box.clientHeight;
    const dpr = devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const k = scaleK(map.getZoom());
    for (const o of lines) drawOne(o.sym, o.side, o.coords, o.kind === 'area', k * o.size, o.id === sel);
    if (draft) {
      drawOne(draft.sym, draft.side, draft.coords, draft.area, k, false);
      g.fillStyle = '#ffd400';
      for (const q of screen(draft.coords)) {
        g.beginPath();
        g.arc(q.x, q.y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
  };
  map.on('render', draw);

  // Перетаскивание выбранного точечного знака.
  let drag: string | null = null;
  const start = (e: maplibregl.MapLayerMouseEvent | maplibregl.MapLayerTouchEvent) => {
    const id = e.features?.[0]?.properties?.id as string | undefined;
    if (!id || id !== sel || ('points' in e && e.points.length !== 1)) return;
    e.preventDefault();
    drag = id;
  };
  const move = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
    if (!drag) return;
    const c: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    points = points.map((p) => (p.id === drag ? { ...p, coords: [c] } : p));
    setPoints();
  };
  const end = () => {
    if (!drag) return;
    const p = points.find((x) => x.id === drag);
    const c = p?.coords[0];
    if (p && c) onMove(p.id, [c[0], c[1]]);
    drag = null;
  };
  map.on('mousedown', 'objs-p', start);
  map.on('touchstart', 'objs-p', start);
  map.on('mousemove', move);
  map.on('touchmove', move);
  map.on('mouseup', end);
  map.on('touchend', end);

  const setPoints = () => {
    const f: Feature[] = points.map((o) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [...(o.coords[0] ?? [0, 0])] },
      properties: { id: o.id, img: `sym/${o.sym}/${o.side}`, rot: o.rot, size: o.size, label: o.label },
    }));
    (map.getSource('objs-p') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: f,
    });
    const s = points.find((o) => o.id === sel);
    (map.getSource('objs-sel') as maplibregl.GeoJSONSource | undefined)?.setData(
      s?.coords[0]
        ? { type: 'Feature', geometry: { type: 'Point', coordinates: [...s.coords[0]] }, properties: {} }
        : EMPTY,
    );
  };

  return {
    update(objs, selected, d) {
      sel = selected;
      draft = d;
      lines = objs.filter((o) => o.kind !== 'point');
      if (!drag) points = objs.filter((o) => o.kind === 'point');
      setPoints();
      map.triggerRepaint();
    },
    hit(x, y) {
      const f = map.queryRenderedFeatures(
        [
          [x - 16, y - 16],
          [x + 16, y + 16],
        ],
        { layers: ['objs-p'] },
      )[0];
      const pid = f?.properties?.id as string | undefined;
      if (pid) return pid;
      let best: string | null = null;
      let bd = 14;
      for (const o of lines) {
        const P = screen(o.coords);
        if (o.kind === 'area' && P.length > 2) {
          if (inside(x, y, P)) return o.id;
          P.push({ ...(P[0] as { x: number; y: number }) });
        }
        for (let i = 1; i < P.length; i++) {
          const d = distToSeg(x, y, P[i - 1] as { x: number; y: number }, P[i] as { x: number; y: number });
          if (d < bd) {
            bd = d;
            best = o.id;
          }
        }
      }
      return best;
    },
    destroy() {
      map.off('render', draw);
      map.off('styleimagemissing', onMissing);
      map.off('mousedown', 'objs-p', start);
      map.off('touchstart', 'objs-p', start);
      map.off('mousemove', move);
      map.off('touchmove', move);
      map.off('mouseup', end);
      map.off('touchend', end);
      cv.remove();
      for (const id of ['objs-p', 'objs-sel']) if (map.getLayer(id)) map.removeLayer(id);
      for (const id of ['objs-p', 'objs-sel']) if (map.getSource(id)) map.removeSource(id);
    },
  };
}
