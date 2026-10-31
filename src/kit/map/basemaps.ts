import type { Basemap } from '@core/model/basemap';

const YA = 'https://core-renderer-tiles.maps.yandex.net/tiles?l=';

/** Подложки (CORE-02). Все отдают CORS — проверено на стенде M0. */
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
    id: 'esri',
    name: 'Спутник Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '© Esri',
  },
  {
    id: 'esri_topo',
    name: 'Топо Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '© Esri',
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
    attribution: '© Яндекс',
  },
];

export function basemapById(id: string): Basemap {
  return BASEMAPS.find((b) => b.id === id) ?? (BASEMAPS[0] as Basemap);
}
