import * as z from 'zod/mini';
import type { Feature } from 'geojson';
import type { MapObject } from './objects';

/** Пакет обмена (CORE-16, CORE-17): общий язык режимов и устройств (docs/ARCHITECTURE.md §8). */
export const MODES = ['operator', 'combat', 'maket', 'shtab'] as const;

const PacketSchema = z.object({
  v: z.literal(1),
  id: z.string(),
  from: z.object({ mode: z.enum(MODES), project: z.string(), at: z.number() }),
  title: z.string(),
  layers: z.array(z.object({ name: z.string(), features: z.array(z.unknown()) })),
});
export type LayerPacket = Omit<z.infer<typeof PacketSchema>, 'layers'> & {
  layers: Array<{ name: string; features: Feature[] }>;
};

export function parsePacket(raw: unknown): LayerPacket {
  const r = PacketSchema.safeParse(raw);
  if (!r.success) throw new Error('Файл не является пакетом обмена СКАТ 2.0');
  return r.data as LayerPacket;
}

/** Обстановка → пакет: знаки — точки, линейные — линии, площадные — полигоны. */
export function objectsToPacket(
  objs: readonly MapObject[],
  from: LayerPacket['from'],
  title: string,
  id = `p${from.at.toString(36)}`,
): LayerPacket {
  const features: Feature[] = objs.map((o) => ({
    type: 'Feature',
    geometry:
      o.kind === 'point'
        ? { type: 'Point', coordinates: [...(o.coords[0] ?? [0, 0])] }
        : o.kind === 'area'
          ? { type: 'Polygon', coordinates: [[...o.coords, o.coords[0] ?? [0, 0]].map((c) => [...c])] }
          : { type: 'LineString', coordinates: o.coords.map((c) => [...c]) },
    properties: {
      sym: o.sym,
      side: o.side,
      label: o.label,
      rot: o.rot,
      size: o.size,
      note: o.note,
      mirror: Boolean(o.mirror),
      flipA: Boolean(o.flipA),
      flipB: Boolean(o.flipB),
    },
  }));
  return { v: 1, id, from, title, layers: [{ name: 'Обстановка', features }] };
}

/** Пакет → объекты обстановки с новыми id. Непонятные объекты пропускаются. */
export function packetToObjects(p: LayerPacket, newId: () => string): MapObject[] {
  const out: MapObject[] = [];
  for (const l of p.layers) {
    for (const f of l.features) {
      const pr = (f.properties ?? {}) as Record<string, unknown>;
      if (typeof pr.sym !== 'string') continue;
      const g = f.geometry;
      const base = {
        id: newId(),
        sym: pr.sym,
        side: pr.side === 'b' ? ('b' as const) : ('r' as const),
        rot: Number(pr.rot) || 0,
        size: Number(pr.size) || 1,
        label: typeof pr.label === 'string' ? pr.label : '',
        note: typeof pr.note === 'string' ? pr.note : '',
        mirror: pr.mirror === true,
        flipA: pr.flipA === true,
        flipB: pr.flipB === true,
      };
      const pair = (c: number[]): [number, number] => [c[0] ?? 0, c[1] ?? 0];
      if (g?.type === 'Point') out.push({ ...base, kind: 'point', coords: [pair(g.coordinates)] });
      else if (g?.type === 'LineString') out.push({ ...base, kind: 'line', coords: g.coordinates.map(pair) });
      else if (g?.type === 'Polygon' && g.coordinates[0])
        out.push({ ...base, kind: 'area', coords: g.coordinates[0].slice(0, -1).map(pair) });
    }
  }
  return out;
}
