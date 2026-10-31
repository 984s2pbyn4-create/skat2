import type { ComponentType } from 'preact';
import { useEffect, useErrorBoundary, useState } from 'preact/hooks';
import type { ModeManifest, ModeShellProps } from '@kit/mode/manifest';
import { Button } from '@kit/ui/Button';

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e));

interface Props {
  readonly mode: ModeManifest;
  readonly onExit: () => void;
}

/** Загружает оболочку режима и изолирует его ошибки: сбой режима не роняет приложение. */
export function ModeHost({ mode, onExit }: Props) {
  const [renderError, reset] = useErrorBoundary((e: unknown) => console.error(`Режим ${mode.id}:`, e));
  const [Shell, setShell] = useState<ComponentType<ModeShellProps> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setShell(null);
    setLoadError(null);
    mode.load().then(
      (m) => alive && setShell(() => m.default),
      (e: unknown) => alive && setLoadError(message(e)),
    );
    return () => {
      alive = false;
    };
  }, [mode]);

  const error = renderError ? message(renderError) : loadError;
  if (error) {
    return (
      <div class="k-center">
        <p>Режим «{mode.title}» остановлен из-за ошибки.</p>
        <p class="k-muted">{error}</p>
        <Button
          variant="primary"
          onClick={() => {
            reset();
            onExit();
          }}
        >
          К выбору режима
        </Button>
      </div>
    );
  }
  if (!Shell) return <p class="k-center k-muted">Загрузка режима…</p>;
  return <Shell onExit={onExit} />;
}
