import type { ModeShellProps } from '@kit/mode/manifest';
import { ModePlaceholder } from '@kit/ui/ModePlaceholder';

/** Оболочка режима «Макет». */
export default function Shell({ onExit }: ModeShellProps) {
  return <ModePlaceholder title="Макет" milestone="2.2" onExit={onExit} />;
}
