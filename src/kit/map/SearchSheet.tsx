import { useEffect, useState } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import { parseCoords } from '@core/geo/search';
import type { Place } from '@core/model/downloads';
import { Button } from '@kit/ui/Button';
import { Sheet } from '@kit/ui/Sheet';
import { symbolById } from '@kit/symbols/catalog';
import { doc } from '@kit/symbols/store';
import { loadPlaces } from './downloads';
import { tiles } from './engine';

interface Hit {
  readonly kind: string;
  readonly label: string;
  readonly lat: number;
  readonly lon: number;
}

let marker: maplibregl.Marker | null = null;

/** Поиск (CORE-08): координаты, квадрат, скачанные н. п., свои знаки, OpenStreetMap в сети. */
export function SearchSheet({
  map,
  onClose,
}: {
  readonly map: maplibregl.Map;
  readonly onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [online, setOnline] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void loadPlaces().then(setPlaces);
  }, []);
  useEffect(() => setOnline(null), [q]);

  const c = map.getCenter();
  const s = q.trim().toLowerCase();
  const hits: Hit[] = s
    ? [
        ...parseCoords(q, { lat: c.lat, lon: c.lng }).map((h) => ({ kind: 'Координаты', ...h })),
        ...places
          .filter((p) => p[0].toLowerCase().includes(s))
          .slice(0, 30)
          .map((p) => ({ kind: 'Н. п.', label: p[0], lat: p[1], lon: p[2] })),
        ...doc.value.objects
          .filter(
            (o) =>
              o.label.toLowerCase().includes(s) || (symbolById(o.sym)?.n ?? '').toLowerCase().includes(s),
          )
          .slice(0, 30)
          .map((o) => ({
            kind: 'Знак',
            label: `${symbolById(o.sym)?.n ?? o.sym}${o.label ? ` «${o.label}»` : ''}`,
            lat: o.coords[0]?.[1] ?? 0,
            lon: o.coords[0]?.[0] ?? 0,
          })),
      ]
    : [];

  const go = (h: Hit) => {
    marker?.remove();
    marker = new maplibregl.Marker({ color: '#ff2d55' }).setLngLat([h.lon, h.lat]).addTo(map);
    map.flyTo({ center: [h.lon, h.lat], zoom: Math.max(map.getZoom(), 13) });
    onClose();
  };
  const searchOnline = async () => {
    setBusy(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=10&accept-language=ru&q=${encodeURIComponent(q)}`;
      const r = (await (await fetch(url)).json()) as Array<{
        display_name: string;
        lat: string;
        lon: string;
      }>;
      setOnline(
        r.map((x) => ({ kind: 'OSM', label: x.display_name, lat: Number(x.lat), lon: Number(x.lon) })),
      );
    } catch {
      setOnline([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Поиск" onClose={onClose}>
      <section class="k-section">
        <div class="m-add">
          <input
            type="text"
            autoFocus
            placeholder="X 54 70 000 Y 74 00 000 · 7000 · 49.35 37.62 · МГРС · название"
            value={q}
            onInput={(e) => setQ(e.currentTarget.value)}
          />
        </div>
        <p class="k-muted">
          Координаты СК-42 полные и сокращённые, квадрат (4 цифры), WGS-84, МГРС, скачанные населённые пункты
          ({places.length}), свои знаки по подписи.
        </p>
        {[...hits, ...(online ?? [])].map((h, i) => (
          <button key={i} type="button" class="k-opt" onClick={() => go(h)}>
            <span class="k-muted">{h.kind}</span> {h.label}
          </button>
        ))}
        {s && !hits.length && online === null && <p class="k-muted">На устройстве не найдено.</p>}
        {s && online === null && !tiles.offline && (
          <Button disabled={busy} onClick={() => void searchOnline()}>
            {busy ? 'Поиск…' : 'Искать в интернете (OpenStreetMap)'}
          </Button>
        )}
        {online?.length === 0 && <p class="k-muted">В интернете не найдено или нет сети.</p>}
      </section>
    </Sheet>
  );
}
