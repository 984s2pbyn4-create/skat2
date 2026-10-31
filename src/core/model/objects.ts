import * as z from 'zod/mini';

/** Объекты обстановки на карте (CORE-10, CORE-11): знаки, линии, районы. Сторона: r — свои (красные), b — противник (синие). */
export const SIDES = ['r', 'b'] as const;
export type Side = (typeof SIDES)[number];
export const KINDS = ['point', 'line', 'area'] as const;
export type ObjKind = (typeof KINDS)[number];

const ObjSchema = z.object({
  id: z.string(),
  sym: z.string(),
  kind: z.enum(KINDS),
  side: z.enum(SIDES),
  coords: z.array(z.tuple([z.number(), z.number()])),
  rot: z.number(),
  size: z.number(),
  label: z.string(),
  note: z.string(),
});
export type MapObject = z.infer<typeof ObjSchema>;

const DocSchema = z.object({
  objects: z.array(ObjSchema),
  trash: z.array(z.object({ obj: ObjSchema, deleted: z.string() })),
});
export type ObjDoc = z.infer<typeof DocSchema>;

export const EMPTY_DOC: ObjDoc = { objects: [], trash: [] };
const TRASH_MAX = 100;

export function parseDoc(raw: unknown): ObjDoc {
  const r = DocSchema.safeParse(raw);
  return r.success ? r.data : EMPTY_DOC;
}

export const addObject = (d: ObjDoc, o: MapObject): ObjDoc => ({ ...d, objects: [...d.objects, o] });

export const updateObject = (d: ObjDoc, id: string, p: Partial<MapObject>): ObjDoc => ({
  ...d,
  objects: d.objects.map((o) => (o.id === id ? { ...o, ...p, id } : o)),
});

/** Удаление — в корзину (последние 100). */
export function deleteObject(d: ObjDoc, id: string, now = new Date()): ObjDoc {
  const obj = d.objects.find((o) => o.id === id);
  if (!obj) return d;
  return {
    objects: d.objects.filter((o) => o.id !== id),
    trash: [{ obj, deleted: now.toISOString() }, ...d.trash].slice(0, TRASH_MAX),
  };
}

export function restoreObject(d: ObjDoc, index: number): ObjDoc {
  const t = d.trash[index];
  if (!t) return d;
  return { objects: [...d.objects, t.obj], trash: d.trash.filter((_, i) => i !== index) };
}

export const emptyTrash = (d: ObjDoc): ObjDoc => ({ ...d, trash: [] });

/** История изменений снимками: до 200 шагов отмены. */
export interface History {
  readonly past: readonly ObjDoc[];
  readonly present: ObjDoc;
  readonly future: readonly ObjDoc[];
}
const HISTORY_MAX = 200;

export const startHistory = (d: ObjDoc): History => ({ past: [], present: d, future: [] });

export function commit(h: History, next: ObjDoc): History {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-HISTORY_MAX), present: next, future: [] };
}

export function undo(h: History): History {
  const prev = h.past[h.past.length - 1];
  return prev ? { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] } : h;
}

export function redo(h: History): History {
  const next = h.future[0];
  return next ? { past: [...h.past, h.present], present: next, future: h.future.slice(1) } : h;
}
