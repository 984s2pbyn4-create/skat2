import { signal } from '@preact/signals';
import { inverse, type LonLat } from '@core/geo/measure';
import { dbGet, dbPut } from '@platform/storage/db';

/** Трек GPS (CORE-07): запись, пока приложение открыто; точки сохраняются на устройстве. */
export const track = signal<{ recording: boolean; points: LonLat[] }>({ recording: false, points: [] });
export const gpsError = signal('');

let watch: number | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function save(): void {
  saveTimer ??= setTimeout(() => {
    saveTimer = null;
    void dbPut('settings', 'track', track.value.points).catch(() => undefined);
  }, 2000);
}

export async function initTrack(): Promise<void> {
  const raw = await dbGet('settings', 'track').catch(() => undefined);
  if (Array.isArray(raw)) track.value = { recording: false, points: raw as LonLat[] };
}

export function startTrack(): void {
  if (watch !== null) return;
  if (!('geolocation' in navigator)) {
    gpsError.value = 'GPS недоступен на этом устройстве';
    return;
  }
  gpsError.value = '';
  track.value = { ...track.value, recording: true };
  watch = navigator.geolocation.watchPosition(
    (p) => {
      if (p.coords.accuracy > 50) return;
      const pt: LonLat = [p.coords.longitude, p.coords.latitude];
      const last = track.value.points[track.value.points.length - 1];
      if (last && inverse(last, pt).m < 5) return;
      track.value = { ...track.value, points: [...track.value.points, pt] };
      save();
    },
    (e) => {
      gpsError.value = e.code === e.PERMISSION_DENIED ? 'Нет разрешения на геолокацию' : 'Нет сигнала GPS';
    },
    { enableHighAccuracy: true, maximumAge: 2000 },
  );
}

export function stopTrack(): void {
  if (watch !== null) navigator.geolocation.clearWatch(watch);
  watch = null;
  track.value = { ...track.value, recording: false };
  void dbPut('settings', 'track', track.value.points).catch(() => undefined);
}

export function clearTrack(): void {
  track.value = { ...track.value, points: [] };
  void dbPut('settings', 'track', []).catch(() => undefined);
}
