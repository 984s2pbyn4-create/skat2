import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

/** Наложения из файлов (CORE-05): KML и GeoJSON → GeoJSON. */
function coords(text: string | null | undefined): Position[] {
  return (text ?? '')
    .trim()
    .split(/\s+/)
    .map((c) => c.split(',').map(Number))
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map((c) => [c[0] as number, c[1] as number]);
}

const first = (el: Element, tag: string): Element | undefined => el.getElementsByTagName(tag)[0];

export function parseKml(text: string): FeatureCollection {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Файл KML повреждён');
  const features: Feature[] = [];
  for (const pm of Array.from(doc.getElementsByTagName('Placemark'))) {
    const name = first(pm, 'name')?.textContent?.trim() ?? '';
    const geoms: Geometry[] = [];
    for (const p of Array.from(pm.getElementsByTagName('Point'))) {
      const c = coords(first(p, 'coordinates')?.textContent)[0];
      if (c) geoms.push({ type: 'Point', coordinates: c });
    }
    for (const l of Array.from(pm.getElementsByTagName('LineString'))) {
      const c = coords(first(l, 'coordinates')?.textContent);
      if (c.length > 1) geoms.push({ type: 'LineString', coordinates: c });
    }
    for (const poly of Array.from(pm.getElementsByTagName('Polygon'))) {
      const rings = Array.from(poly.getElementsByTagName('LinearRing'))
        .map((r) => coords(first(r, 'coordinates')?.textContent))
        .filter((r) => r.length > 3);
      if (rings.length) geoms.push({ type: 'Polygon', coordinates: rings });
    }
    for (const geometry of geoms) features.push({ type: 'Feature', geometry, properties: { name } });
  }
  if (!features.length) throw new Error('В файле нет точек, линий или полигонов');
  return { type: 'FeatureCollection', features };
}

export function parseGeoJson(text: string): FeatureCollection {
  let j: unknown;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error('Файл GeoJSON повреждён');
  }
  const o = j as { type?: string; features?: unknown };
  if (o.type === 'FeatureCollection' && Array.isArray(o.features)) return o as FeatureCollection;
  if (o.type === 'Feature') return { type: 'FeatureCollection', features: [o as Feature] };
  throw new Error('Это не GeoJSON');
}

/** Разобрать файл по расширению. */
export async function readVectorFile(f: File): Promise<FeatureCollection> {
  const text = await f.text();
  return /\.kml$/i.test(f.name) ? parseKml(text) : parseGeoJson(text);
}
