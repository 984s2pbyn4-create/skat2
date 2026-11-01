import { decryptJson, encryptJson } from '@platform/crypto/vault';
import { sessionKey } from '@platform/crypto/session';
import { dbEntries, dbGet, dbPut, type StoreName } from './db';

/** Шифрование данных при заданном PIN (CORE-15): записи хранилищ projects и exchange — AES-256-GCM. */
interface Sealed {
  readonly sealed: 1;
  readonly iv: string;
  readonly ct: string;
}
const isSealed = (v: unknown): v is Sealed =>
  typeof v === 'object' && v !== null && (v as Sealed).sealed === 1;

export const SECURE_STORES: readonly StoreName[] = ['projects', 'exchange'];

export async function secureGet(store: StoreName, key: IDBValidKey): Promise<unknown> {
  const v = await dbGet(store, key);
  if (!isSealed(v)) return v;
  const k = sessionKey.value;
  if (!k) throw new Error('Данные зашифрованы: нужен PIN');
  return decryptJson(k, v);
}

export async function securePut(store: StoreName, key: IDBValidKey, value: unknown): Promise<void> {
  const k = sessionKey.value;
  await dbPut(store, key, k ? { sealed: 1, ...(await encryptJson(k, value)) } : value);
}

/**
 * Перешифровать все записи защищённых хранилищ: from — прежний ключ (null — данные открыты),
 * to — новый (null — снять шифрование). Вызывается при установке и снятии PIN.
 */
export async function reseal(from: CryptoKey | null, to: CryptoKey | null): Promise<void> {
  for (const store of SECURE_STORES) {
    for (const [key, v] of await dbEntries(store)) {
      const plain = isSealed(v) ? (from ? await decryptJson(from, v) : null) : v;
      if (plain === null) continue;
      await dbPut(store, key, to ? { sealed: 1, ...(await encryptJson(to, plain)) } : plain);
    }
  }
}

/** Записи хранилища с ключами, начинающимися с prefix (расшифрованные). Нечитаемые пропускаются. */
export async function secureEntries(store: StoreName, prefix: string): Promise<Array<[string, unknown]>> {
  const out: Array<[string, unknown]> = [];
  for (const [key, v] of await dbEntries(store)) {
    if (typeof key !== 'string' || !key.startsWith(prefix)) continue;
    try {
      const k = sessionKey.value;
      out.push([key, isSealed(v) ? (k ? await decryptJson(k, v) : null) : v]);
    } catch {
      /* чужой ключ — пропустить */
    }
  }
  return out.filter(([, v]) => v !== null);
}
