import type { ModeShellProps } from '@kit/mode/manifest';
import { Button } from './Button';

interface Props extends ModeShellProps {
  readonly title: string;
  /** Веха, на которой режим появится. */
  readonly milestone: string;
}

/** Временная оболочка режима, пока его функции не перенесены. */
export function ModePlaceholder({ title, milestone, onExit }: Props) {
  return (
    <div>
      <header class="k-bar">
        <Button variant="ghost" onClick={onExit}>
          ‹ Режимы
        </Button>
        <h1>{title}</h1>
      </header>
      <main class="k-center">
        <p>Режим в разработке.</p>
        <p class="k-muted">Появится на вехе {milestone}.</p>
      </main>
    </div>
  );
}
