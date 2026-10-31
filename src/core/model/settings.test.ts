import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './settings';

describe('настройки', () => {
  it('пусто — значения по умолчанию без ошибки', () => {
    expect(parseSettings(undefined)).toEqual({ settings: DEFAULT_SETTINGS });
  });
  it('валидные сохраняются', () => {
    const s = { version: 1, theme: 'red', vault: null } as const;
    expect(parseSettings(s).settings).toEqual(s);
  });
  it('испорченные — сброс и сообщение', () => {
    const r = parseSettings({ version: 1, theme: 'blue' });
    expect(r.settings).toEqual(DEFAULT_SETTINGS);
    expect(r.problem).toBeTruthy();
  });
});
