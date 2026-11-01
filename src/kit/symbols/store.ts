import { computed, signal } from '@preact/signals';
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
  type History,
  type MapObject,
  type ObjDoc,
} from '@core/model/objects';
import { secureGet, securePut } from '@platform/storage/secure';

/** Обстановка режима: объекты, корзина, отмена и повтор (CORE-14). Сохраняется через 500 мс после изменения. */
export const history = signal<History>(startHistory(EMPTY_DOC));
export const doc = computed(() => history.value.present);
export const selected = signal<string | null>(null);

let key = '';
let timer: ReturnType<typeof setTimeout> | null = null;

export async function loadObjects(project: string): Promise<void> {
  if (key === project) return;
  key = project;
  history.value = startHistory(
    parseDoc(await secureGet('projects', `${project}/objects`).catch(() => undefined)),
  );
}

function persist(): void {
  if (timer) clearTimeout(timer);
  const k = key;
  timer = setTimeout(() => {
    timer = null;
    void securePut('projects', `${k}/objects`, history.value.present).catch((e: unknown) =>
      console.warn('Обстановка не сохранена:', e),
    );
  }, 500);
}

function apply(next: ObjDoc): void {
  history.value = commit(history.value, next);
  persist();
}

export const objects = {
  add(o: MapObject) {
    apply(addObject(doc.value, o));
    selected.value = o.id;
  },
  /** Добавить много объектов одним шагом истории (приём пакета). */
  addMany(list: readonly MapObject[]) {
    apply(list.reduce((d, o) => addObject(d, o), doc.value));
  },
  update(id: string, p: Partial<MapObject>) {
    apply(updateObject(doc.value, id, p));
  },
  remove(id: string) {
    apply(deleteObject(doc.value, id));
    if (selected.value === id) selected.value = null;
  },
  restore(i: number) {
    apply(restoreObject(doc.value, i));
  },
  emptyTrash() {
    apply(emptyTrash(doc.value));
  },
  undo() {
    history.value = undo(history.value);
    persist();
  },
  redo() {
    history.value = redo(history.value);
    persist();
  },
};

export const newId = (): string => `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
