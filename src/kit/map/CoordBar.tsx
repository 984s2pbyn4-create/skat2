import { useEffect, useState } from 'preact/hooks';
import type maplibregl from 'maplibre-gl';
import { COORD_LABEL, formatCoords } from '@core/geo/format';
import { COORD_FORMATS, type CoordFormat } from '@core/model/mapView';

interface Props {
  readonly map: maplibregl.Map;
  readonly format: CoordFormat;
  readonly onFormat: (f: CoordFormat) => void;
}

/** Координаты центра карты (перекрестие). Нажатие на формат — следующий формат. */
export function CoordBar({ map, format, onFormat }: Props) {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const c = map.getCenter();
      setText(formatCoords(c.lat, c.lng, format));
    };
    const onMove = () => {
      raf ||= requestAnimationFrame(update);
    };
    update();
    map.on('move', onMove);
    return () => {
      map.off('move', onMove);
      cancelAnimationFrame(raf);
    };
  }, [map, format]);

  const next = COORD_FORMATS[(COORD_FORMATS.indexOf(format) + 1) % COORD_FORMATS.length] ?? 'sk42';
  const copy = () => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div class="m-coords">
      <button type="button" class="m-coords-f" onClick={() => onFormat(next)} title="Сменить формат">
        {COORD_LABEL[format]}
      </button>
      <span class="m-coords-v">{text}</span>
      <button type="button" class="m-coords-c" onClick={copy}>
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
    </div>
  );
}
