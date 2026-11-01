import { useEffect, useRef, useState } from 'preact/hooks';
import type { Theme } from '@core/model/settings';
import { Button } from '@kit/ui/Button';
import { PinPad } from '@kit/ui/PinPad';
import { createVault, rewrapVault } from '@platform/crypto/vault';
import { exportBackup, importBackup } from '@platform/storage/backup';
import { persistStorage, storageUsage } from '@platform/storage/db';
import { saveBlob } from '@platform/files/save';
import { reseal } from '@platform/storage/secure';
import { PRESETS, SWITCHABLE } from '@kit/feature/profiles';
import { dataKey, saveSettings, settings } from '../state';

const THEMES: ReadonlyArray<readonly [Theme, string]> = [
  ['night', 'Ночное видение'],
  ['red', 'Красная ночная'],
];

interface PinFlow {
  readonly step: 'new' | 'confirm';
  readonly first?: string;
  readonly message?: string;
  readonly n: number;
}

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Настройки: тема, PIN, резервная копия, хранилище. */
export function SettingsScreen({ onExit }: { readonly onExit: () => void }) {
  const s = settings.value;
  const [flow, setFlow] = useState<PinFlow | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [usage, setUsage] = useState('…');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageUsage().then(setUsage, () => setUsage('нет данных'));
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  const pinSubmit = async (pin: string) => {
    if (!flow) return;
    if (flow.step === 'new') {
      setFlow({ step: 'confirm', first: pin, n: flow.n + 1 });
      return;
    }
    if (pin !== flow.first) {
      setFlow({ step: 'new', message: 'PIN не совпал — введите заново', n: flow.n + 1 });
      return;
    }
    setBusy(true);
    try {
      let vault;
      if (dataKey.value) vault = await rewrapVault(dataKey.value, pin);
      else {
        const created = await createVault(pin);
        vault = created.vault;
        await reseal(null, created.key);
        dataKey.value = created.key;
      }
      await saveSettings({ vault });
      setInfo('PIN сохранён. Он понадобится при каждом запуске.');
    } catch (e) {
      setInfo(`Не удалось сохранить PIN: ${errText(e)}`);
    } finally {
      setBusy(false);
      setFlow(null);
    }
  };

  if (flow) {
    return (
      <div class="k-center">
        <PinPad
          key={flow.n}
          title={flow.step === 'new' ? 'Новый PIN, 4–8 цифр' : 'Повторите PIN'}
          message={flow.message}
          error={Boolean(flow.message)}
          busy={busy}
          onSubmit={(p) => void pinSubmit(p)}
          onCancel={() => setFlow(null)}
        />
      </div>
    );
  }

  const removePin = async () => {
    if (!confirm('Убрать PIN? Приложение будет открываться без кода.')) return;
    setInfo('Снятие шифрования…');
    await reseal(dataKey.value, null);
    await saveSettings({ vault: null });
    dataKey.value = null;
    setInfo('PIN убран.');
  };

  const backup = async () => {
    try {
      const blob = await exportBackup(__APP_VERSION__);
      saveBlob(blob, `skat2-копия-${new Date().toISOString().slice(0, 10)}.json`);
      setInfo('Резервная копия сохранена в загрузки.');
    } catch (e) {
      setInfo(`Ошибка копии: ${errText(e)}`);
    }
  };

  const restore = async (f: File | undefined) => {
    if (!f) return;
    if (!confirm('Данные на устройстве будут заменены данными из копии. Продолжить?')) return;
    try {
      await importBackup(await f.text());
      location.reload();
    } catch (e) {
      setInfo(errText(e));
    }
  };

  return (
    <div>
      <header class="k-bar">
        <Button variant="ghost" onClick={onExit}>
          ‹ Режимы
        </Button>
        <h1>Настройки</h1>
      </header>
      {info && (
        <div class="k-section">
          <p class="k-note">{info}</p>
        </div>
      )}
      <section class="k-section">
        <h2>Тема</h2>
        <div class="k-row">
          {THEMES.map(([id, label]) => (
            <Button
              key={id}
              variant={s.theme === id ? 'primary' : 'default'}
              onClick={() => void saveSettings({ theme: id })}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>
      <section class="k-section">
        <h2>PIN-код</h2>
        <p class="k-muted">
          {s.vault
            ? 'PIN задан: приложение открывается только по коду, обстановка на устройстве зашифрована.'
            : 'PIN не задан.'}
        </p>
        <div class="k-row">
          <Button onClick={() => setFlow({ step: 'new', n: 0 })}>
            {s.vault ? 'Сменить PIN' : 'Задать PIN'}
          </Button>
          {s.vault && <Button onClick={() => void removePin()}>Убрать PIN</Button>}
        </div>
      </section>
      <section class="k-section">
        <h2>Резервная копия</h2>
        <p class="k-muted">Все данные, кроме тайлов карт, — в один файл.</p>
        <div class="k-row">
          <Button onClick={() => void backup()}>Сохранить в файл</Button>
          <Button onClick={() => file.current?.click()}>Восстановить из файла</Button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => void restore(e.currentTarget.files?.[0])}
          />
        </div>
      </section>
      <section class="k-section">
        <h2>Профиль устройства</h2>
        <p class="k-muted">
          Какие функции видны на этом устройстве. Данные выключенных функций не удаляются.
        </p>
        <div class="k-row">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              variant={
                JSON.stringify([...(s.off ?? [])].sort()) === JSON.stringify([...p.off].sort())
                  ? 'primary'
                  : 'default'
              }
              onClick={() => void saveSettings({ off: [...p.off] })}
            >
              {p.name}
            </Button>
          ))}
        </div>
        {SWITCHABLE.map(([id, name]) => (
          <label key={id} class="k-opt">
            <input
              type="checkbox"
              checked={!(s.off ?? []).includes(id)}
              onChange={(e) => {
                const off = (s.off ?? []).filter((x) => x !== id);
                void saveSettings({ off: e.currentTarget.checked ? off : [...off, id] });
              }}
            />
            {name}
          </label>
        ))}
      </section>
      <section class="k-section">
        <h2>Хранилище</h2>
        <p class="k-muted">
          Занято {usage}. Защита от очистки браузером:{' '}
          {persisted ? 'есть' : persisted === false ? 'нет' : 'неизвестно'}.
        </p>
        {persisted === false && (
          <Button onClick={() => void persistStorage().then((r) => setPersisted(r))}>Запросить защиту</Button>
        )}
      </section>
      <section class="k-section">
        <h2>О приложении</h2>
        <p class="k-muted">СКАТ 2.0, версия {__APP_VERSION__}</p>
      </section>
    </div>
  );
}
