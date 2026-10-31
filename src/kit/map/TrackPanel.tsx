import { formatDistance, pathLength } from '@core/geo/measure';
import type maplibregl from 'maplibre-gl';
import { Button } from '@kit/ui/Button';
import { clearTrack, gpsError, startTrack, stopTrack, track } from './track';

/** Панель трека: запись, длина, показать, очистить. */
export function TrackPanel({ map, onClose }: { readonly map: maplibregl.Map; readonly onClose: () => void }) {
  const { recording, points } = track.value;
  const fit = () => {
    if (points.length < 2) return;
    const lons = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 40 },
    );
  };
  return (
    <div class="m-tool">
      <div class="k-row">
        <b>Трек</b>
        <span class="k-muted">
          {recording ? 'идёт запись' : 'остановлен'} · {points.length} точек ·{' '}
          {formatDistance(pathLength(points))}
        </span>
      </div>
      {gpsError.value && <p class="k-pin-msg err">{gpsError.value}</p>}
      <p class="k-muted">
        Запись идёт, пока приложение открыто. «Ко мне» и «следовать» — кнопка геолокации справа внизу.
      </p>
      <div class="k-row">
        {recording ? (
          <Button onClick={stopTrack}>Остановить</Button>
        ) : (
          <Button variant="primary" onClick={startTrack}>
            Записывать
          </Button>
        )}
        <Button disabled={points.length < 2} onClick={fit}>
          Показать
        </Button>
        <Button
          disabled={!points.length || recording}
          onClick={() => confirm('Удалить трек?') && clearTrack()}
        >
          Очистить
        </Button>
        <Button onClick={onClose}>Скрыть</Button>
      </div>
    </div>
  );
}
