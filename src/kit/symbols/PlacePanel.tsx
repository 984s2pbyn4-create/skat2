import type { ObjKind } from '@core/model/objects';
import { Button } from '@kit/ui/Button';
import type { SymDef } from './engine6';

interface Props {
  readonly sym: SymDef;
  readonly kind: ObjKind;
  readonly count: number;
  readonly onCenter: () => void;
  readonly onUndo: () => void;
  readonly onDone: () => void;
  readonly onCancel: () => void;
}

/** Постановка знака: точечный — одним касанием, линейный и площадной — по точкам. */
export function PlacePanel({ sym, kind, count, onCenter, onUndo, onDone, onCancel }: Props) {
  const need = kind === 'area' ? 3 : 2;
  return (
    <div class="m-tool">
      <div class="k-row">
        <b>{sym.n}</b>
        {kind !== 'point' && <span class="k-muted">точек: {count}</span>}
      </div>
      <p class="k-muted">
        {kind === 'point'
          ? 'Нажмите на карту или поставьте в перекрестие.'
          : `Нажимайте на карту или ставьте точки в перекрестии, затем «Готово» (не меньше ${need}).`}
      </p>
      <div class="k-row">
        <Button onClick={onCenter}>{kind === 'point' ? 'В перекрестие' : '+ в перекрестии'}</Button>
        {kind !== 'point' && (
          <>
            <Button disabled={!count} onClick={onUndo}>
              Отменить точку
            </Button>
            <Button variant="primary" disabled={count < need} onClick={onDone}>
              Готово
            </Button>
          </>
        )}
        <Button onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
}
