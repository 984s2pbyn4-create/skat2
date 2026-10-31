import type { ModeShellProps } from '@kit/mode/manifest';
import { ModePlaceholder } from '@kit/ui/ModePlaceholder';

/** Оболочка режима «Боевой контур». */
export default function Shell({ onExit }: ModeShellProps) {
  return <ModePlaceholder title="Боевой контур" milestone="M3" onExit={onExit} />;
}
