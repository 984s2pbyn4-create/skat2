import * as z from 'zod/mini';
import { fromBase64, toBase64 } from '@core/util/base64';

/** Резервная копия хранилища: JSON, двоичные данные — в base64 с пометкой {$b64}. */
export const BACKUP_FORMAT = 'skat2-backup';

const BackupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  app: z.string(),
  created: z.string(),
  stores: z.record(z.string(), z.array(z.tuple([z.union([z.string(), z.number()]), z.unknown()]))),
});
export type Backup = z.infer<typeof BackupSchema>;
export type Entry = readonly [string | number, unknown];

/** Значение → JSON-совместимый вид. */
export function encodeValue(v: unknown): unknown {
  if (v instanceof ArrayBuffer) return { $b64: toBase64(new Uint8Array(v)) };
  if (ArrayBuffer.isView(v)) return { $b64: toBase64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
  if (Array.isArray(v)) return v.map(encodeValue);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encodeValue(x)]));
  }
  return v;
}

/** Обратное преобразование: {$b64} → ArrayBuffer. */
export function decodeValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(decodeValue);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.$b64 === 'string' && Object.keys(o).length === 1) return fromBase64(o.$b64).buffer;
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, decodeValue(x)]));
  }
  return v;
}

export function makeBackup(
  app: string,
  stores: Record<string, readonly Entry[]>,
  created = new Date(),
): Backup {
  const out: Backup['stores'] = {};
  for (const [name, entries] of Object.entries(stores))
    out[name] = entries.map(([k, v]) => [k, encodeValue(v)]);
  return { format: BACKUP_FORMAT, version: 1, app, created: created.toISOString(), stores: out };
}

/** Разбор файла копии. Ошибка — понятным текстом. */
export function readBackup(text: string): Record<string, Entry[]> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Файл не является резервной копией СКАТ 2.0');
  }
  const r = BackupSchema.safeParse(json);
  if (!r.success) throw new Error('Файл не является резервной копией СКАТ 2.0');
  const out: Record<string, Entry[]> = {};
  for (const [name, entries] of Object.entries(r.data.stores))
    out[name] = entries.map(([k, v]) => [k, decodeValue(v)]);
  return out;
}
