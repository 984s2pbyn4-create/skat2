import type { DeviceClass } from '@core/model/device';
import type { ModeManifest } from '@kit/mode/manifest';
import { Button } from '@kit/ui/Button';
import './launcher.css';

interface Props {
  readonly modes: readonly ModeManifest[];
  readonly device: DeviceClass;
  readonly notice?: string;
  readonly onOpen: (id: string) => void;
  readonly onSettings: () => void;
}

/** Экран выбора режима. */
export function Launcher({ modes, device, notice, onOpen, onSettings }: Props) {
  return (
    <div class="l-wrap">
      <header class="l-head">
        <img class="k-logo" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={56} height={56} />
        <div>
          <h1>СКАТ 2.0</h1>
          <p class="k-muted">Версия {__APP_VERSION__}</p>
        </div>
        <span class="l-spacer" />
        <Button onClick={onSettings}>Настройки</Button>
      </header>
      {notice && <p class="k-note">{notice}</p>}
      <ul class="l-grid">
        {modes.map((m) => {
          const ok = m.devices.includes(device);
          return (
            <li key={m.id}>
              <button type="button" class="l-tile" disabled={!ok} onClick={() => onOpen(m.id)}>
                <span class="l-title">{m.title}</span>
                <span class="l-sum">{ok ? m.summary : 'Недоступно на этом устройстве'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
