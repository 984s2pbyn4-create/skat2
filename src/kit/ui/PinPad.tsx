import { useEffect, useState } from 'preact/hooks';
import { Button } from './Button';

interface Props {
  readonly title: string;
  readonly message?: string;
  readonly error?: boolean;
  readonly busy?: boolean;
  readonly onSubmit: (pin: string) => void;
  readonly onCancel?: () => void;
}

const MAX = 8;
const MIN = 4;

/** Цифровая клавиатура PIN: касание и клавиатура ПК. Для сброса ввода смените key. */
export function PinPad({ title, message, error = false, busy = false, onSubmit, onCancel }: Props) {
  const [pin, setPin] = useState('');
  const add = (d: string) => !busy && setPin((p) => (p.length < MAX ? p + d : p));
  const del = () => !busy && setPin((p) => p.slice(0, -1));
  const ok = pin.length >= MIN && !busy;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) add(e.key);
      else if (e.key === 'Backspace') del();
      else if (e.key === 'Enter' && ok) onSubmit(pin);
      else if (e.key === 'Escape' && onCancel) onCancel();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const dots = Math.max(MIN, pin.length);
  return (
    <div class="k-pin">
      <h2>{title}</h2>
      <p class="k-pin-dots" aria-label={`Введено цифр: ${pin.length}`}>
        {Array.from({ length: dots }, (_, i) => (
          <i key={i} class={i < pin.length ? 'on' : ''} />
        ))}
      </p>
      <p class={error ? 'k-pin-msg err' : 'k-pin-msg'}>{busy ? 'Проверка…' : (message ?? '')}</p>
      <div class="k-pin-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button type="button" key={d} onClick={() => add(d)}>
            {d}
          </button>
        ))}
        {onCancel ? (
          <button type="button" class="k-pin-aux" onClick={onCancel}>
            Отмена
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => add('0')}>
          0
        </button>
        <button type="button" class="k-pin-aux" onClick={del} aria-label="Стереть">
          ⌫
        </button>
      </div>
      <Button variant="primary" disabled={!ok} onClick={() => onSubmit(pin)}>
        Готово
      </Button>
    </div>
  );
}
