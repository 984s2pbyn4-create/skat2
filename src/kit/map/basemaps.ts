import type { Basemap } from '@core/model/basemap';
import type { CustomMap } from '@core/model/mapView';

const YA = 'https://core-renderer-tiles.maps.yandex.net/tiles?l=';
const G = 'https://mt{s}.google.com/vt/lyrs=';

/** Подложки (CORE-02): список СКАТ 6.x (без 2ГИС и CartoDB — не отдают карту без ключа) и Bing. Форматы: XYZ, TMS, квадключ Bing, Яндекс 3395. */
export const BASEMAPS: readonly Basemap[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  },
  {
    id: 'topo',
    name: 'Топокарта OTM',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 17,
    attribution: '© OpenStreetMap, SRTM, © OpenTopoMap',
  },
  {
    id: 'esri_topo',
    name: 'Esri: топокарта',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '© Esri',
  },
  {
    id: 'esri',
    name: 'Esri: спутник',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    dark: true,
    attribution: '© Esri',
  },
  {
    id: 'g_sat',
    name: 'Google: спутник',
    url: `${G}s&x={x}&y={y}&z={z}`,
    subdomains: '0123',
    maxZoom: 20,
    dark: true,
    attribution: '© Google',
  },
  {
    id: 'g_hyb',
    name: 'Google: гибрид',
    url: `${G}y&x={x}&y={y}&z={z}`,
    subdomains: '0123',
    maxZoom: 20,
    dark: true,
    attribution: '© Google',
  },
  {
    id: 'g_map',
    name: 'Google: карта',
    url: `${G}m&x={x}&y={y}&z={z}`,
    subdomains: '0123',
    maxZoom: 20,
    attribution: '© Google',
  },
  {
    id: 'g_ter',
    name: 'Google: рельеф',
    url: `${G}p&x={x}&y={y}&z={z}`,
    subdomains: '0123',
    maxZoom: 20,
    attribution: '© Google',
  },
  {
    id: 'bing',
    name: 'Bing: спутник',
    url: 'https://ecn.t{s}.tiles.virtualearth.net/tiles/a{q}.jpeg?g=1',
    subdomains: '0123',
    maxZoom: 19,
    dark: true,
    attribution: '© Microsoft',
  },
  {
    id: 'ya_map',
    name: 'Яндекс: схема',
    url: `${YA}map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU`,
    maxZoom: 19,
    ellipsoidal: true,
    attribution: '© Яндекс',
  },
  {
    id: 'ya_sat',
    name: 'Яндекс: спутник',
    url: 'https://core-sat.maps.yandex.net/tiles?l=sat&v=3.1025.0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
    maxZoom: 19,
    ellipsoidal: true,
    dark: true,
    attribution: '© Яндекс',
  },
];

const registry = new Map<string, Basemap>(BASEMAPS.map((b) => [b.id, b]));

/** Свои карты пользователя — в общий список подложек. */
export function registerCustom(list: readonly CustomMap[]): void {
  for (const [id] of registry) if (id.startsWith('u_')) registry.delete(id);
  for (const c of list) registry.set(c.id, { ...c, attribution: c.name });
}

export function basemapById(id: string): Basemap {
  return registry.get(id) ?? (BASEMAPS[0] as Basemap);
}
