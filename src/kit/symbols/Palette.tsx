import { useState } from 'preact/hooks';
import type { Side } from '@core/model/objects';
import { Button } from '@kit/ui/Button';
import { Sheet } from '@kit/ui/Sheet';
import type { SymDef } from './engine6';
import { CATEGORIES, SYMBOLS, symbolById, thumbnail } from './catalog';
import { doc, objects } from './store';

interface Props {
  readonly side: Side;
  readonly onSide: (s: Side) => void;
  readonly onPick: (s: SymDef) => void;
  readonly onClose: () => void;
}

/** Каталог тактических знаков (CORE-10, CORE-11) и корзина (CORE-14). */
export function Palette({ side, onSide, onPick, onClose }: Props) {
  const [cat, setCat] = useState(CATEGORIES[0] ?? '');
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = query
    ? SYMBOLS.filter((s) => s.n.toLowerCase().includes(query) || (s.ab ?? '').toLowerCase().includes(query))
    : SYMBOLS.filter((s) => s.cat === cat);
  const trash = doc.value.trash;
  return (
    <Sheet title="Знаки" onClose={onClose}>
      <section class="k-section">
        <div class="k-row">
          <Button variant={side === 'r' ? 'primary' : 'default'} onClick={() => onSide('r')}>
            Свои (красные)
          </Button>
          <Button variant={side === 'b' ? 'primary' : 'default'} onClick={() => onSide('b')}>
            Противник (синие)
          </Button>
        </div>
        <div class="m-add">
          <input
            type="text"
            placeholder="Поиск знака"
            value={q}
            onInput={(e) => setQ(e.currentTarget.value)}
          />
        </div>
        {!query && (
          <div class="m-chips">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" class={c === cat ? 'on' : ''} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div class="m-pal">
          {list.map((s) => (
            <button key={s.id} type="button" title={s.n} onClick={() => onPick(s)}>
              <img src={thumbnail(s, side)} alt="" />
              {s.n}
            </button>
          ))}
        </div>
        {!list.length && <p class="k-muted">Ничего не найдено.</p>}
      </section>
      <section class="k-section">
        <h2>Корзина</h2>
        {!trash.length && <p class="k-muted">Пусто.</p>}
        {trash.slice(0, 30).map((t, i) => (
          <div key={`${t.obj.id}${t.deleted}`} class="k-row">
            <span>
              {symbolById(t.obj.sym)?.n ?? t.obj.sym}
              {t.obj.label ? ` «${t.obj.label}»` : ''}
            </span>
            <span class="k-muted">{new Date(t.deleted).toLocaleTimeString('ru-RU')}</span>
            <Button onClick={() => objects.restore(i)}>Восстановить</Button>
          </div>
        ))}
        {trash.length > 0 && (
          <Button
            onClick={() =>
              confirm('Очистить корзину без возможности восстановления?') && objects.emptyTrash()
            }
          >
            Очистить корзину
          </Button>
        )}
      </section>
    </Sheet>
  );
}
