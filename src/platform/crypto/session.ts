import { signal } from '@preact/signals';

/** Ключ данных текущего сеанса: появляется после ввода PIN, без PIN — null. */
export const sessionKey = signal<CryptoKey | null>(null);
