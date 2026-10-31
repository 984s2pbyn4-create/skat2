import { makeBackup, readBackup, type Entry } from '@core/model/backup';
import { STORES, dbEntries, dbReplace, type StoreName } from './db';

/** В копию не входят тайлы: их можно скачать заново. */
const IN_BACKUP = STORES.filter((s) => s !== 'tiles');

export async function exportBackup(app: string): Promise<Blob> {
  const stores: Record<string, Entry[]> = {};
  for (const s of IN_BACKUP) stores[s] = (await dbEntries(s)).map(([k, v]) => [k as string | number, v]);
  return new Blob([JSON.stringify(makeBackup(app, stores))], { type: 'application/json' });
}

/** Восстановление заменяет данные хранилищ из копии. */
export async function importBackup(text: string): Promise<void> {
  const data = readBackup(text);
  for (const s of IN_BACKUP) {
    const entries = data[s];
    if (entries) await dbReplace(s as StoreName, entries);
  }
}
