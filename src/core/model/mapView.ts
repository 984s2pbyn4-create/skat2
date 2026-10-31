import * as z from 'zod/mini';

/** Состояние карты, которое сохраняется между запусками. */
export const COORD_FORMATS = ['sk42', 'wgs', 'mgrs'] as const;
export type CoordFormat = (typeof COORD_FORMATS)[number];

const MapViewSchema = z.object({
  version: z.literal(1),
  center: z.tuple([z.number(), z.number()]),
  zoom: z.number(),
  bearing: z.number(),
  basemap: z.string(),
  grid: z.boolean(),
  offline: z.boolean(),
  coords: z.enum(COORD_FORMATS),
});
export type MapView = z.infer<typeof MapViewSchema>;

export const DEFAULT_MAP_VIEW: MapView = {
  version: 1,
  center: [37.6173, 55.7558],
  zoom: 11,
  bearing: 0,
  basemap: 'osm',
  grid: true,
  offline: false,
  coords: 'sk42',
};

export function parseMapView(raw: unknown): MapView {
  const r = MapViewSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_MAP_VIEW;
}
