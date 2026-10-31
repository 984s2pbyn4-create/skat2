import { useState } from 'preact/hooks';
import { PinPad } from '@kit/ui/PinPad';
import { Button } from '@kit/ui/Button';
import { openVault } from '@platform/crypto/vault';
import { STORES, dbReplace } from '@platform/storage/db';
import { dataKey, phase, settings } from '../state';

const PAUSE_EVERY = 5;
const PAUSE_MS = 30_000;

/** Вход по PIN при запуске. Каждые 5 ошибок — пауза 30 с. */
export function PinScreen() {
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pauseUntil, setPauseUntil] = useState(0);

  const submit = async (pin: string) => {
    const vault = settings.value.vault;
    if (!vault) {
      phase.value = 'ready';
      return;
    }
    const left = pauseUntil - Date.now();
    if (left > 0) {
      setMessage(`Пауза: подождите ${Math.ceil(left / 1000)} с`);
      setAttempt((a) => a + 1);
      return;
    }
    setBusy(true);
    const key = await openVault(pin, vault);
    setBusy(false);
    if (key) {
      dataKey.value = key;
      phase.value = 'ready';
      return;
    }
    const n = attempt + 1;
    setAttempt(n);
    if (n % PAUSE_EVERY === 0) {
      setPauseUntil(Date.now() + PAUSE_MS);
      setMessage('Неверный PIN. Пауза 30 с');
    } else setMessage(`Неверный PIN (ошибок: ${n})`);
  };

  const forgot = async () => {
    const ok = confirm('Без PIN данные не открыть. Удалить все данные на устройстве и начать заново?');
    if (!ok) return;
    for (const s of STORES) await dbReplace(s, []);
    location.reload();
  };

  return (
    <div class="k-center">
      <img class="k-logo" src={`${import.meta.env.BASE_URL}icon-192.png`} width={64} height={64} alt="" />
      <PinPad
        key={attempt}
        title="Введите PIN"
        message={message}
        error={message !== ''}
        busy={busy}
        onSubmit={(p) => void submit(p)}
      />
      <Button variant="ghost" onClick={() => void forgot()}>
        Забыли PIN?
      </Button>
    </div>
  );
}
