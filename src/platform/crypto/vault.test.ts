import { describe, expect, it } from 'vitest';
import { createVault, decryptJson, encryptJson, openVault, rewrapVault } from './vault';

describe('PIN и ключ данных', () => {
  it('верный PIN открывает, неверный — нет; данные расшифровываются', async () => {
    const { vault, key } = await createVault('2468');
    expect(await openVault('1111', vault)).toBeNull();
    const k2 = await openVault('2468', vault);
    expect(k2).not.toBeNull();
    const rec = await encryptJson(key, { цель: 12101 });
    expect(await decryptJson(k2 as CryptoKey, rec)).toEqual({ цель: 12101 });
  });
  it('смена PIN сохраняет ключ данных', async () => {
    const { vault, key } = await createVault('2468');
    const v2 = await rewrapVault(key, '9753');
    expect(await openVault('2468', v2)).toBeNull();
    const k2 = await openVault('9753', v2);
    const rec = await encryptJson(key, [1, 2]);
    expect(await decryptJson(k2 as CryptoKey, rec)).toEqual([1, 2]);
    expect(vault.salt).not.toBe(v2.salt);
  });
});
