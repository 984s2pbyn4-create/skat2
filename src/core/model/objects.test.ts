import { describe, expect, it } from 'vitest';
import {
  EMPTY_DOC,
  addObject,
  commit,
  deleteObject,
  emptyTrash,
  parseDoc,
  redo,
  restoreObject,
  startHistory,
  undo,
  updateObject,
  type MapObject,
} from './objects';

const o = (id: string): MapObject => ({
  id,
  sym: 'pu',
  kind: 'point',
  side: 'r',
  coords: [[37.6, 49.3]],
  rot: 0,
  size: 1,
  label: '',
  note: '',
});

describe('объекты обстановки', () => {
  it('добавление, правка, удаление в корзину и восстановление', () => {
    let d = addObject(addObject(EMPTY_DOC, o('a')), o('b'));
    d = updateObject(d, 'a', { label: '12101', id: 'x' });
    expect(d.objects[0]).toMatchObject({ id: 'a', label: '12101' });
    d = deleteObject(d, 'a', new Date(0));
    expect(d.objects.map((x) => x.id)).toEqual(['b']);
    expect(d.trash[0]?.obj.label).toBe('12101');
    d = restoreObject(d, 0);
    expect(d.objects.map((x) => x.id)).toEqual(['b', 'a']);
    expect(emptyTrash(deleteObject(d, 'b')).trash).toEqual([]);
    expect(deleteObject(d, 'нет')).toBe(d);
  });
  it('отмена и повтор', () => {
    let h = startHistory(EMPTY_DOC);
    h = commit(h, addObject(h.present, o('a')));
    h = commit(h, addObject(h.present, o('b')));
    h = undo(h);
    expect(h.present.objects.length).toBe(1);
    h = redo(h);
    expect(h.present.objects.length).toBe(2);
    h = undo(undo(h));
    expect(undo(h)).toBe(h);
    h = commit(h, addObject(h.present, o('c')));
    expect(h.future.length).toBe(0);
    expect(redo(h)).toBe(h);
  });
  it('история не длиннее 200 шагов; проверка схемой при загрузке', () => {
    let h = startHistory(EMPTY_DOC);
    for (let i = 0; i < 250; i++) h = commit(h, addObject(h.present, o(`o${i}`)));
    expect(h.past.length).toBe(200);
    expect(parseDoc({ objects: [o('a')], trash: [] }).objects.length).toBe(1);
    expect(parseDoc({ objects: [{ id: 1 }] })).toEqual(EMPTY_DOC);
  });
});
