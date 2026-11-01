import { useEffect, useState } from 'preact/hooks';
import { MODES, objectsToPacket, packetToObjects, parsePacket, type LayerPacket } from '@core/model/packet';
import { Button } from '@kit/ui/Button';
import { Sheet } from '@kit/ui/Sheet';
import { doc, newId, objects } from '@kit/symbols/store';
import { saveBlob } from '@platform/files/save';
import { dbDeleteMany } from '@platform/storage/db';
import { secureEntries, securePut } from '@platform/storage/secure';

const MODE_NAME: Record<(typeof MODES)[number], string> = {
  operator: 'Оператор',
  combat: 'Боевой контур',
  maket: 'Макет',
  shtab: 'Штаб',
};

interface Incoming {
  readonly key: string;
  readonly packet: LayerPacket;
  readonly received: string;
  readonly source: string;
}

type Mode = (typeof MODES)[number];

/** Обмен обстановкой (CORE-16, CORE-17 — файлом): отправка в режим, в файл; входящие. */
export function ExchangeSheet({ mode, onClose }: { readonly mode: Mode; readonly onClose: () => void }) {
  const [inbox, setInbox] = useState<Incoming[]>([]);
  const [msg, setMsg] = useState('');
  const load = async () => {
    const list = await secureEntries('exchange', `inbox/${mode}/`);
    setInbox(
      list
        .map(([key, v]) => ({ key, ...(v as Omit<Incoming, 'key'>) }))
        .sort((a, b) => b.received.localeCompare(a.received)),
    );
  };
  useEffect(() => {
    void load();
  }, []);

  const packet = () =>
    objectsToPacket(
      doc.value.objects,
      { mode, project: mode, at: Date.now() },
      `Обстановка: ${MODE_NAME[mode]}`,
    );
  const toFile = () => {
    saveBlob(
      new Blob([JSON.stringify(packet())], { type: 'application/json' }),
      `skat2-обстановка-${new Date().toISOString().slice(0, 10)}.json`,
    );
    setMsg('Файл сохранён в загрузки — передайте его на другое устройство.');
  };
  const toMode = async (to: Mode) => {
    const p = packet();
    await securePut('exchange', `inbox/${to}/${p.id}`, {
      packet: p,
      received: new Date().toISOString(),
      source: MODE_NAME[mode],
    });
    setMsg(`Отправлено в «${MODE_NAME[to]}»: объектов ${doc.value.objects.length}.`);
  };
  const fromFile = () => {
    const i = document.createElement('input');
    i.type = 'file';
    i.onchange = async () => {
      const f = i.files?.[0];
      if (!f) return;
      try {
        const p = parsePacket(JSON.parse(await f.text()));
        await securePut('exchange', `inbox/${mode}/${p.id}`, {
          packet: p,
          received: new Date().toISOString(),
          source: `файл ${f.name}`,
        });
        await load();
        setMsg('Пакет во входящих — проверьте и добавьте на карту.');
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Файл не читается');
      }
    };
    i.click();
  };
  const accept = async (it: Incoming) => {
    const list = packetToObjects(it.packet, newId);
    objects.addMany(list.map((o) => ({ ...o, note: o.note || `из: ${it.source}` })));
    await dbDeleteMany('exchange', [it.key]);
    await load();
    setMsg(`Добавлено на карту: ${list.length}. Отменить — «↶ Отменить».`);
  };
  const remove = async (it: Incoming) => {
    await dbDeleteMany('exchange', [it.key]);
    await load();
  };

  return (
    <Sheet title="Обмен" onClose={onClose}>
      {msg && (
        <div class="k-section">
          <p class="k-note">{msg}</p>
        </div>
      )}
      <section class="k-section">
        <h2>Отправить обстановку ({doc.value.objects.length})</h2>
        <div class="k-row">
          <Button onClick={toFile}>В файл</Button>
          {MODES.filter((m) => m !== mode).map((m) => (
            <Button key={m} onClick={() => void toMode(m)}>
              В «{MODE_NAME[m]}»
            </Button>
          ))}
        </div>
      </section>
      <section class="k-section">
        <h2>Входящие</h2>
        <Button onClick={fromFile}>Принять из файла…</Button>
        {!inbox.length && <p class="k-muted">Пусто.</p>}
        {inbox.map((it) => (
          <div key={it.key} class="m-area">
            <div class="k-row">
              <b>{it.packet.title}</b>
              <span class="k-muted">
                от: {it.source} · {new Date(it.received).toLocaleString('ru-RU')} ·{' '}
                {it.packet.layers.reduce((n, l) => n + l.features.length, 0)} объектов
              </span>
            </div>
            <div class="k-row">
              <Button variant="primary" onClick={() => void accept(it)}>
                Добавить на карту
              </Button>
              <Button onClick={() => void remove(it)}>Удалить</Button>
            </div>
          </div>
        ))}
      </section>
    </Sheet>
  );
}
