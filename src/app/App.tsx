import { detectDevice } from '@platform/device/detect';
import { Launcher } from './launcher/Launcher';
import { ModeHost } from './ModeHost';
import { MODES, findMode } from './modes';
import { go, route } from './router';

const device = detectDevice();

/** Корень приложения: выбор режима или открытый режим. */
export function App() {
  const mode = findMode(route.value);
  if (mode && mode.devices.includes(device)) return <ModeHost mode={mode} onExit={() => go('')} />;
  return <Launcher modes={MODES} device={device} onOpen={go} />;
}
