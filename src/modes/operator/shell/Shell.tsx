import type { ModeShellProps } from '@kit/mode/manifest';
import { ModePlaceholder } from '@kit/ui/ModePlaceholder';

/** Оболочка режима «Оператор». */
export default function Shell({ onExit }: ModeShellProps) {
  return <ModePlaceholder title="Оператор" milestone="M4" onExit={onExit} />;
}
