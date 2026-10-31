import { detectDevice } from '@platform/device/detect';
import { Launcher } from './launcher/Launcher';
import { ModeHost } from './ModeHost';
import { MODES, findMode } from './modes';
import { PinScreen } from './pin/PinScreen';
import { go, route } from './router';
import { SettingsScreen } from './settings/SettingsScreen';
import { Splash } from './Splash';
import { notice, phase } from './state';

const device = detectDevice();
const home = () => go('');

/** Корень приложения: заставка → PIN → выбор режима, настройки или открытый режим. */
export function App() {
  if (phase.value === 'boot') return <Splash />;
  if (phase.value === 'locked') return <PinScreen />;
  if (route.value === 'settings') return <SettingsScreen onExit={home} />;
  const mode = findMode(route.value);
  if (mode && mode.devices.includes(device)) return <ModeHost mode={mode} onExit={home} />;
  return (
    <Launcher
      modes={MODES}
      device={device}
      notice={notice.value}
      onOpen={go}
      onSettings={() => go('settings')}
    />
  );
}
