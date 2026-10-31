import { signal } from '@preact/signals';

/** Открытый режим берётся из адреса (#combat): работают «Назад» в браузере и ссылки на режим. */
const read = (): string => decodeURIComponent(location.hash.replace(/^#/, ''));

export const route = signal<string>(read());

export function startRouter(): void {
  addEventListener('hashchange', () => {
    route.value = read();
  });
}

export function go(id: string): void {
  location.hash = id;
}
