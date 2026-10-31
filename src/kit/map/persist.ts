import { parseMapView, type MapView } from '@core/model/mapView';
import { dbGet, dbPut } from '@platform/storage/db';

export async function loadMapView(): Promise<MapView> {
  try {
    return parseMapView(await dbGet('settings', 'map'));
  } catch {
    return parseMapView(undefined);
  }
}

export function saveMapView(v: MapView): Promise<void> {
  return dbPut('settings', 'map', v).catch((e: unknown) => console.warn('Состояние карты не сохранено:', e));
}
