import type { ModeShellProps } from '@kit/mode/manifest';
import { ModePlaceholder } from '@kit/ui/ModePlaceholder';

/** Оболочка режима «Штаб». */
export default function Shell({ onExit }: ModeShellProps) {
  return <ModePlaceholder title="Штаб" milestone="2.1" onExit={onExit} />;
}
