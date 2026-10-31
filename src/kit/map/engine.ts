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

/** Скачанные названия: вид пункта, с какого масштаба показывать, размер шрифта. */
const PLACE_LEVELS: ReadonlyArray<readonly [string, number, number]> = [
  ['c', 6, 15],
  ['t', 8, 13],
  ['v', 10.5, 12],
  ['h', 12.5, 11],
];

/** Цвета сетки как в 6.x: тёмные линии на светлой подложке, светлые — на спутнике. */
function gridColors(dark: boolean) {
  return dark
    ? {
        line: 'rgba(255,255,255,0.62)',
        halo: 'rgba(0,0,0,0.28)',
        text: '#f4f4f0',
        textHalo: 'rgba(0,0,0,0.65)',
      }
    : {
        line: 'rgba(30,30,30,0.62)',
        halo: 'rgba(255,255,255,0.4)',
        text: '#222222',
        textHalo: 'rgba(255,255,255,0.85)',
      };
}

/** Стиль карты: подложка и сетка СК-42 с подписями квадратов. Шрифт подписей — в сборке (public/fonts). */
export function buildStyle(b: Basemap): StyleSpecification {
  const c = gridColors(Boolean(b.dark));
  return {
    version: 8,
    glyphs: `${new URL('fonts/', document.baseURI).href}{fontstack}/{range}.pbf`,
    sources: {
      base: rasterSource(b),
      grid: { type: 'geojson', data: EMPTY_FC },
      places: { type: 'geojson', data: EMPTY_FC },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#c9d0c6' } },
      { id: 'base', type: 'raster', source: 'base' },
      {
        id: 'grid-s',
        type: 'line',
        source: 'grid',
        filter: ['has', 's'],
        paint: { 'line-color': c.line, 'line-width': 0.7, 'line-opacity': 0.55, 'line-dasharray': [3, 5] },
      },
      {
        id: 'grid-h',
        type: 'line',
        source: 'grid',
        filter: ['has', 'k'],
        paint: { 'line-color': c.halo, 'line-width': 2.5 },
      },
      {
        id: 'grid-l',
        type: 'line',
        source: 'grid',
        filter: ['has', 'k'],
        paint: { 'line-color': c.line, 'line-width': 1 },
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
        filter: ['has', 't'],
        layout: {
          'text-field': ['get', 't'],
          'text-font': FONT,
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 15, 14],
          'text-anchor': 'bottom-left',
          'text-offset': [0.3, -0.25],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': c.text, 'text-halo-color': c.textHalo, 'text-halo-width': 1.5 },
      },
      ...PLACE_LEVELS.map(([k, minzoom, size]) => ({
        id: `places-${k}`,
        type: 'symbol' as const,
        source: 'places',
        minzoom,
        filter: ['==', ['get', 'k'], k] as ['==', ['get', string], string],
        layout: {
          'text-field': ['get', 'n'] as ['get', string],
          'text-font': FONT,
          'text-size': size,
          'text-padding': 4,
        },
        paint: { 'text-color': c.text, 'text-halo-color': c.textHalo, 'text-halo-width': 1.6 },
      })),
    ],
  };
}

/** Перекрасить сетку под подложку. */
export function applyGridColors(map: maplibregl.Map, dark: boolean): void {
  const c = gridColors(dark);
  map.setPaintProperty('grid-s', 'line-color', c.line);
  map.setPaintProperty('grid-h', 'line-color', c.halo);
  map.setPaintProperty('grid-l', 'line-color', c.line);
  map.setPaintProperty('grid-t', 'text-color', c.text);
  map.setPaintProperty('grid-t', 'text-halo-color', c.textHalo);
  for (const [k] of PLACE_LEVELS) {
    map.setPaintProperty(`places-${k}`, 'text-color', c.text);
    map.setPaintProperty(`places-${k}`, 'text-halo-color', c.textHalo);
  }
}

/** Показать скачанные названия населённых пунктов (или скрыть — пустой список). */
export function setPlaces(
  map: maplibregl.Map,
  places: ReadonlyArray<readonly [string, number, number, string]>,
): void {
  const src = map.getSource('places') as maplibregl.GeoJSONSource | undefined;
  src?.setData({
    type: 'FeatureCollection',
    features: places.map(([n, lat, lon, k]) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lon, lat] },
      properties: { n, k },
    })),
  });
}

export function setBasemap(map: maplibregl.Map, b: Basemap): void {
  if (map.getLayer('base')) map.removeLayer('base');
  if (map.getSource('base')) map.removeSource('base');
  map.addSource('base', rasterSource(b));
  map.addLayer({ id: 'base', type: 'raster', source: 'base' }, 'grid-s');
  applyGridColors(map, Boolean(b.dark));
}
