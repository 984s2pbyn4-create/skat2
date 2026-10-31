import type { ModeShellProps } from '@kit/mode/manifest';
import { MapWorkspace } from '@kit/map/MapWorkspace';

/** Оболочка режима «Боевой контур»: пока — рабочее поле карты (M2a). */
export default function Shell({ onExit }: ModeShellProps) {
  return <MapWorkspace title="Боевой контур" onExit={onExit} />;
}
