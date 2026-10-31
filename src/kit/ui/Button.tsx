import type { ComponentChildren } from 'preact';

interface Props {
  readonly children: ComponentChildren;
  readonly onClick?: () => void;
  readonly variant?: 'default' | 'primary' | 'ghost';
  readonly disabled?: boolean;
}

/** Кнопка с зоной касания не меньше 44 px. */
export function Button({ children, onClick, variant = 'default', disabled = false }: Props) {
  const cls = variant === 'default' ? 'k-btn' : `k-btn k-btn--${variant}`;
  return (
    <button type="button" class={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
