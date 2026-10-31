import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import type { Basemap } from '@core/model/basemap';
import { TileLoader } from '@platform/tiles/loader';
import { basemapById } from './basemaps';

/** Один загрузчик тайлов на приложение. */
export const tiles = new TileLoader();

let registered = false;
let empty: Promise<ArrayBuffer> | null = null;

/** Прозрачный тайл: карта не показывает ошибку там, где тайла нет. */
function emptyTile(): Promise<ArrayBuffer> {
  empty ??= new Promise<Blob | null>((r) => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    c.toBlob(r, 'image/png');
  }).then((b) => (b ? b.arrayBuffer() : new ArrayBuffer(0)));
  return empty;
}

/** Протокол skat://<подложка>/{z}/{x}/{y} для MapLibre. */
export function registerSkatProtocol(): void {
  if (registered) return;
  registered = true;
  maplibregl.addProtocol('skat', async (p, ac) => {
    const m = /^skat:\/\/([\w-]+)\/(\d+)\/(\d+)\/(\d+)/.exec(p.url);
    const b = m
      ? await tiles.get(basemapById(m[1] ?? ''), Number(m[2]), Number(m[3]), Number(m[4]), ac.signal)
      : null;
    return { data: b ?? (await emptyTile()).slice(0) };
  });
}

export const FONT = ['Noto Sans Medium'];
export const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

export function rasterSource(b: Basemap) {
  return {
    type: 'raster' as const,
    tiles: [`skat://${b.id}/{z}/{x}/{y}`],
    tileSize: 256,
    maxzoom: b.maxZoom,
    attribution: b.attribution,
  };
}

/** Стиль карты: подложка, сетка СК-42 с подписями. Шрифты подписей — в сборке (public/fonts). */
export function buildStyle(b: Basemap): StyleSpecification {
  return {
    version: 8,
    glyphs: `${new URL('fonts/', document.baseURI).href}{fontstack}/{range}.pbf`,
    sources: { base: rasterSource(b), grid: { type: 'geojson', data: EMPTY_FC } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#c9d0c6' } },
      { id: 'base', type: 'raster', source: 'base' },
      {
        id: 'grid-l',
        type: 'line',
        source: 'grid',
        filter: ['!', ['has', 'zb']],
        paint: { 'line-color': '#d4322c', 'line-width': 1, 'line-opacity': 0.85 },
      },
      {
        id: 'grid-z',
        type: 'line',
        source: 'grid',
        filter: ['has', 'zb'],
        paint: { 'line-color': '#d4322c', 'line-width': 2, 'line-dasharray': [4, 3] },
      },
      {
        id: 'grid-t',
        type: 'symbol',
        source: 'grid',
        filter: ['has', 'k'],
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 280,
          'text-field': ['get', 'k'],
          'text-font': FONT,
          'text-size': 12,
        },
        paint: { 'text-color': '#b0201b', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
      },
    ],
  };
}

export function setBasemap(map: maplibregl.Map, b: Basemap): void {
  if (map.getLayer('base')) map.removeLayer('base');
  if (map.getSource('base')) map.removeSource('base');
  map.addSource('base', rasterSource(b));
  map.addLayer({ id: 'base', type: 'raster', source: 'base' }, 'grid-l');
}
