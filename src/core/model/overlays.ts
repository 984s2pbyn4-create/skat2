import * as z from 'zod/mini';

/** Свои файлы карт .mbtiles (CORE-04): тайлы лежат в кэше с ключом «<id>/z/x/y». */
const LocalMapSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: z.string(),
  minZoom: z.number(),
  maxZoom: z.number(),
  bounds: z.nullable(z.tuple([z.number(), z.number(), z.number(), z.number()])),
  tiles: z.number(),
  bytes: z.number(),
});
export type LocalMap = z.infer<typeof LocalMapSchema>;

/** Наложение (CORE-05): векторное (KML, GeoJSON) или изображение по четырём углам. */
const OverlaySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['vector', 'image']),
  visible: z.boolean(),
  opacity: z.number(),
  /** Углы изображения: СЗ, СВ, ЮВ, ЮЗ — [долгота, широта]. */
  corners: z.optional(z.array(z.tuple([z.number(), z.number()]))),
});
export type Overlay = z.infer<typeof OverlaySchema>;

/** Стопка карт: вторая подложка поверх основной с прозрачностью. */
const StackSchema = z.object({ basemap: z.string(), opacity: z.number() });
export type MapStack = z.infer<typeof StackSchema>;

const LayersStateSchema = z.object({
  local: z.array(LocalMapSchema),
  overlays: z.array(OverlaySchema),
  stack: z.nullable(StackSchema),
});
export type LayersState = z.infer<typeof LayersStateSchema>;

export const EMPTY_LAYERS: LayersState = { local: [], overlays: [], stack: null };

export function parseLayersState(raw: unknown): LayersState {
  const r = LayersStateSchema.safeParse(raw);
  return r.success ? r.data : EMPTY_LAYERS;
}
