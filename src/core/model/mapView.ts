import * as z from 'zod/mini';
import { fromSK } from '@core/geo/sk42';

/** Состояние карты, которое сохраняется между запусками. */
export const COORD_FORMATS = ['sk42', 'sk42s', 'wgs', 'mgrs'] as const;
export type CoordFormat = (typeof COORD_FORMATS)[number];

const CustomMapSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  maxZoom: z.number(),
  dark: z.boolean(),
});
export type CustomMap = z.infer<typeof CustomMapSchema>;

const MapViewSchema = z.object({
  version: z.literal(1),
  center: z.tuple([z.number(), z.number()]),
  zoom: z.number(),
  bearing: z.number(),
  basemap: z.string(),
  grid: z.boolean(),
  offline: z.boolean(),
  coords: z.enum(COORD_FORMATS),
  custom: z.optional(z.array(CustomMapSchema)),
  places: z.optional(z.boolean()),
});
export type MapView = Omit<z.infer<typeof MapViewSchema>, 'custom' | 'places'> & {
  custom: CustomMap[];
  /** Показывать скачанные названия населённых пунктов. */
  places: boolean;
};

/** Район по умолчанию: X 54 70 000, Y 74 00 000 (СК-42). */
const [LAT0, LON0] = fromSK(5_470_000, 7_400_000);

export const DEFAULT_MAP_VIEW: MapView = {
  version: 1,
  center: [LON0, LAT0],
  zoom: 12,
  bearing: 0,
  basemap: 'osm',
  grid: true,
  offline: false,
  coords: 'sk42',
  custom: [],
  places: true,
};

export function parseMapView(raw: unknown): MapView {
  const r = MapViewSchema.safeParse(raw);
  return r.success
    ? { ...r.data, custom: r.data.custom ?? [], places: r.data.places ?? true }
    : DEFAULT_MAP_VIEW;
}
