import type { Vault } from '@core/model/settings';
import { fromBase64, toBase64 } from '@core/util/base64';

/** Ключ данных AES-256-GCM, закрытый ключом из PIN (PBKDF2-SHA-256). docs/ARCHITECTURE.md §5. */
const ITERATIONS = 210_000;
const random = (n: number): Uint8Array<ArrayBuffer> =>
  crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));

async function pinKey(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

async function wrap(key: CryptoKey, pin: string): Promise<Vault> {
  const salt = random(16);
  const iv = random(12);
  const kek = await pinKey(pin, salt, ITERATIONS);
  const wrapped = await crypto.subtle.wrapKey('raw', key, kek, { name: 'AES-GCM', iv });
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    wrapped: toBase64(new Uint8Array(wrapped)),
    iterations: ITERATIONS,
  };
}

/** Новый ключ данных под новым PIN. */
export async function createVault(pin: string): Promise<{ vault: Vault; key: CryptoKey }> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  return { vault: await wrap(key, pin), key };
}

/** Открыть ключ данных. Неверный PIN — null. */
export async function openVault(pin: string, v: Vault): Promise<CryptoKey | null> {
  try {
    const kek = await pinKey(pin, fromBase64(v.salt), v.iterations);
    return await crypto.subtle.unwrapKey(
      'raw',
      fromBase64(v.wrapped),
      kek,
      { name: 'AES-GCM', iv: fromBase64(v.iv) },
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt'],
    );
  } catch {
    return null;
  }
}

/** Смена PIN: тот же ключ данных, новая обёртка. */
export function rewrapVault(key: CryptoKey, newPin: string): Promise<Vault> {
  return wrap(key, newPin);
}

/** Шифрование записи хранилища. */
export async function encryptJson(key: CryptoKey, value: unknown): Promise<{ iv: string; ct: string }> {
  const iv = random(12);
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

export async function decryptJson(key: CryptoKey, rec: { iv: string; ct: string }): Promise<unknown> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(rec.iv) },
    key,
    fromBase64(rec.ct),
  );
  return JSON.parse(new TextDecoder().decode(pt));
}
