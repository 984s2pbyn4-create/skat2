import { signal } from '@preact/signals';
import type maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { parseLayersState, EMPTY_LAYERS, type LayersState, type Overlay } from '@core/model/overlays';
import { dbDeleteMany, dbGet, dbPut } from '@platform/storage/db';
import { basemapById, registerLocal } from './basemaps';
import { rasterSource } from './engine';

/** Свои файлы карт, наложения, стопка карт — сохраняются между запусками. */
export const layers = signal<LayersState>(EMPTY_LAYERS);

let loaded: Promise<void> | null = null;
export function initLayers(): Promise<void> {
  loaded ??= (async () => {
    layers.value = parseLayersState(await dbGet('settings', 'layers').catch(() => undefined));
    registerLocal(layers.value.local);
  })();
  return loaded;
}

export function setLayers(patch: Partial<LayersState>): void {
  layers.value = { ...layers.value, ...patch };
  registerLocal(layers.value.local);
  void dbPut('settings', 'layers', layers.value).catch((e: unknown) => console.warn('Слои не сохранены:', e));
}

export function patchOverlay(id: string, p: Partial<Overlay>): void {
  setLayers({ overlays: layers.value.overlays.map((o) => (o.id === id ? { ...o, ...p } : o)) });
}

export async function addOverlay(
  o: Overlay,
  data: FeatureCollection | { buf: ArrayBuffer; type: string },
): Promise<void> {
  await dbPut('assets', `overlay/${o.id}`, data);
  setLayers({ overlays: [...layers.value.overlays, o] });
}

export async function removeOverlay(id: string): Promise<void> {
  await dbDeleteMany('assets', [`overlay/${id}`]);
  setLayers({ overlays: layers.value.overlays.filter((o) => o.id !== id) });
}

const VECTOR_COLOR = '#ff8a00';
const urls = new Map<string, string>();

/** Убрать с карты слои наложений и стопки. */
function clear(map: maplibregl.Map): void {
  for (const l of map.getStyle().layers)
    if (l.id.startsWith('ov-') || l.id === 'stack') map.removeLayer(l.id);
  for (const id of Object.keys(map.getStyle().sources))
    if (id.startsWith('ov-') || id === 'stack') map.removeSource(id);
}

/** Нарисовать стопку карт и наложения под сеткой. Вызывается при каждом изменении. */
export async function applyLayers(map: maplibregl.Map): Promise<void> {
  const st = layers.value;
  const data = new Map<string, unknown>();
  for (const o of st.overlays)
    if (o.visible) data.set(o.id, await dbGet('assets', `overlay/${o.id}`).catch(() => undefined));
  clear(map);
  const before = 'grid-s';
  if (st.stack) {
    map.addSource('stack', rasterSource(basemapById(st.stack.basemap)));
    map.addLayer(
      { id: 'stack', type: 'raster', source: 'stack', paint: { 'raster-opacity': st.stack.opacity } },
      before,
    );
  }
  for (const o of st.overlays) {
    const d = data.get(o.id);
    if (!o.visible || !d) continue;
    const src = `ov-${o.id}`;
    if (o.kind === 'image' && o.corners?.length === 4) {
      const img = d as { buf: ArrayBuffer; type: string };
      let url = urls.get(o.id);
      if (!url) {
        url = URL.createObjectURL(new Blob([img.buf], { type: img.type }));
        urls.set(o.id, url);
      }
      const c = o.corners as Array<[number, number]>;
      map.addSource(src, {
        type: 'image',
        url,
        coordinates: [c[0], c[1], c[2], c[3]] as [
          [number, number],
          [number, number],
          [number, number],
          [number, number],
        ],
      });
      map.addLayer(
        {
          id: `${src}-i`,
          type: 'raster',
          source: src,
          paint: { 'raster-opacity': o.opacity, 'raster-fade-duration': 0 },
        },
        before,
      );
    } else if (o.kind === 'vector') {
      map.addSource(src, { type: 'geojson', data: d as FeatureCollection });
      map.addLayer(
        {
          id: `${src}-f`,
          type: 'fill',
          source: src,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: { 'fill-color': VECTOR_COLOR, 'fill-opacity': 0.2 * o.opacity },
        },
        before,
      );
      map.addLayer(
        {
          id: `${src}-l`,
          type: 'line',
          source: src,
          filter: ['!=', ['geometry-type'], 'Point'],
          paint: { 'line-color': VECTOR_COLOR, 'line-width': 2.5, 'line-opacity': o.opacity },
        },
        before,
      );
      map.addLayer(
        {
          id: `${src}-p`,
          type: 'circle',
          source: src,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-color': VECTOR_COLOR,
            'circle-radius': 5,
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 1.5,
            'circle-opacity': o.opacity,
          },
        },
        before,
      );
    }
  }
}

/** Двигать угол изображения без полной перерисовки. */
export function moveImage(map: maplibregl.Map, o: Overlay, corners: Array<[number, number]>): void {
  const s = map.getSource(`ov-${o.id}`) as maplibregl.ImageSource | undefined;
  s?.setCoordinates(corners as [[number, number], [number, number], [number, number], [number, number]]);
}
