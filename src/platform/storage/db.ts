/** IndexedDB `skat2` (docs/ARCHITECTURE.md §5). Тонкая обёртка без зависимостей. */
export const STORES = ['projects', 'assets', 'tiles', 'exchange', 'settings', 'errors'] as const;
export type StoreName = (typeof STORES)[number];

let dbp: Promise<IDBDatabase> | null = null;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error ?? new Error('Ошибка хранилища'));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = tx.onabort = () => rej(tx.error ?? new Error('Ошибка хранилища'));
  });
}

export function openDb(): Promise<IDBDatabase> {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('skat2', 1);
    r.onupgradeneeded = () => {
      for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error ?? new Error('Хранилище недоступно'));
  });
  return dbp;
}

export async function dbGet(store: StoreName, key: IDBValidKey): Promise<unknown> {
  const db = await openDb();
  return req(db.transaction(store).objectStore(store).get(key));
}

export async function dbPut(store: StoreName, key: IDBValidKey, value: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value, key);
  return done(tx);
}

export async function dbEntries(store: StoreName): Promise<Array<[IDBValidKey, unknown]>> {
  const db = await openDb();
  const s = db.transaction(store).objectStore(store);
  const [keys, values] = await Promise.all([req(s.getAllKeys()), req(s.getAll())]);
  return keys.map((k, i) => [k, values[i]]);
}

/** Заменить всё содержимое хранилища одной транзакцией. */
export async function dbReplace(store: StoreName, entries: ReadonlyArray<readonly [IDBValidKey, unknown]>) {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const s = tx.objectStore(store);
  s.clear();
  for (const [k, v] of entries) s.put(v, k);
  return done(tx);
}

/** Попросить браузер не стирать данные. null — браузер не поддерживает. */
export async function persistStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}

export async function storageUsage(): Promise<string> {
  if (!navigator.storage?.estimate) return 'нет данных';
  const e = await navigator.storage.estimate();
  return `${((e.usage ?? 0) / 1048576).toFixed(1)} МБ`;
}

/** Записать много значений одной транзакцией. */
export async function dbPutMany(store: StoreName, entries: ReadonlyArray<readonly [IDBValidKey, unknown]>) {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const s = tx.objectStore(store);
  for (const [k, v] of entries) s.put(v, k);
  return done(tx);
}

export async function dbCount(store: StoreName): Promise<number> {
  const db = await openDb();
  return req(db.transaction(store).objectStore(store).count());
}

export async function dbDeleteMany(store: StoreName, keys: readonly IDBValidKey[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const s = tx.objectStore(store);
  for (const k of keys) s.delete(k);
  return done(tx);
}

/** Удалить все ключи в диапазоне [lower, upper] — например, все тайлы одной карты. */
export async function dbDeleteRange(store: StoreName, lower: string, upper: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(IDBKeyRange.bound(lower, upper));
  return done(tx);
}
