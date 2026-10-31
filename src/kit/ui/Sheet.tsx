import type { ComponentChildren } from 'preact';
import { Button } from './Button';

interface Props {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ComponentChildren;
}

/** Панель поверх карты: снизу на телефоне и планшете, справа на ПК. */
export function Sheet({ title, onClose, children }: Props) {
  return (
    <div class="k-sheet-wrap" onClick={onClose}>
      <div class="k-sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header class="k-sheet-h">
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
        </header>
        <div class="k-sheet-b">{children}</div>
      </div>
    </div>
  );
}
