# СКАТ 2.0 — архитектура

Версия документа: 1 (этап 1, 31.10.2026). Каталог функций — `FEATURES.md`, правила работы — `CLAUDE.md`.

## 1. Цели и ограничения

- Платформы: **ПК (Windows, EXE)** и **Android (APK)** — основные; iPhone/iPad — PWA с GitHub Pages.
- Офлайн-первый: всё работает без сети, в том числе в закрытых сетях.
- Разработчик без компьютера: сборка, проверки и выпуск — только в GitHub Actions; изменения приходят одним архивом через `inbox/`.
- Экономия лимита Claude: код разбит так, чтобы для правки хватало одной папки функции.
- Четыре **независимых** режима: Оператор, Боевой контур, Макет, Штаб. Общего у них — только ядро; данные между режимами ходят лишь явным обменом.

## 2. Решения (ADR)

| № | Решение | Почему |
|---|---|---|
| 001 | TypeScript (strict) + Vite | один код для всех платформ; типы ловят ошибки до запуска |
| 002 | Preact + @preact/signals | экран обновляется сам и точечно; синтаксис React, ~5 КБ |
| 003 | MapLibre GL JS 5 — единый движок 2D и 3D | поворот и наклон штатно, WebGL на тысячах знаков, один набор слоёв |
| 004 | Канон координат — WGS-84; Оператор хранит геометрию в плоскости СК-42 (Гаусс–Крюгер, зона проекта) | карта и GPS живут в WGS-84; чертёж листа точен в метрах и миллиметрах |
| 005 | Режимы независимы, обмен — пакетами слоёв | режим можно убрать или собрать отдельно, не сломав остальные |
| 006 | Все изменения — командами, история — патчи Immer | надёжные ↶/↷ без снимков всего состояния |
| 007 | IndexedDB + схемы zod + миграции по версиям | данные проверяются при загрузке, старые форматы обновляются автоматически |
| 008 | Windows — Electron | свой Chromium: одинаково работает на любом ПК и без WebView2 |
| 009 | Android — Capacitor 6 | зрелые плагины, нативные части на Kotlin при необходимости |
| 010 | Доставка — zip в `inbox/` + Action `apply-patch` | один файл с iPhone; проверки до попадания в репозиторий |
| 011 | SemVer 2.x.y + Conventional Commits | версия соответствует имени «СКАТ 2.0»; понятная история |
| 012 | Иконки Tabler (outline, MIT) | единый стиль, тысячи иконок, без эмодзи |

Окончательный выбор отдельных библиотек (булевы операции, PDF) — по итогам проверки движка (веха M0).

## 3. Уровни и правила зависимостей

```
app ──► modes/<режим> ──► kit ──► platform ──► core
           │                       ▲
           └──── напрямую ─────────┘
```

| Уровень | Папка | Содержит | Может зависеть от |
|---|---|---|---|
| core | `src/core` | чистая логика без DOM: СК-42, МГРС, единицы, базовые типы, утилиты | ни от чего |
| platform | `src/platform` | адаптеры среды: хранилище, файлы, шифрование, GPS, «Поделиться», уведомления (web / Android / Electron) | core |
| kit | `src/kit` | общие подсистемы: карта, знаки, обмен, история, формат проекта, UI-набор | core, platform |
| modes | `src/modes/<режим>` | режим: оболочка, состояние, функции | core, platform, kit, **только свой режим** |
| app | `src/app` | запуск, заставка, PIN, выбор режима, настройки, перенос данных 6.x | всё, режимы — только через их `index.ts` |

Нарушение правил валит сборку (dependency-cruiser в CI). Глобальных переменных нет.

## 4. Функция = модуль

Каждая функция из `FEATURES.md` — папка внутри своего режима (ядро — внутри `kit`):

```
src/modes/combat/features/fire-tasks/     ← BK-11
├─ index.ts      манифест: defineFeature({...}) — единственный публичный вход
├─ model.ts      типы, схема zod, миграции
├─ logic/        чистые функции + *.test.ts
├─ ui/           компоненты (грузятся лениво)
├─ map/          слои карты
└─ README.md     что делает, контракты, зависимости (для людей и Claude)
```

```ts
export default defineFeature({
  id: 'BK-11',
  title: 'Огневые задачи',
  requires: ['CORE-10'],
  state: { key: 'fireTasks', version: 1, schema, initial, migrate },
  commands: { createTask, fire, stop },
  slots: {
    rail: { icon: 'crosshair', label: 'Корр.', open: () => import('./ui/TaskPanel') },
    mapLayers: [tasksLayer],
    exchange: { provides: ['bk.fireTasks'] },
  },
});
```

- **Слоты** — места в оболочке режима: `rail`, `topbar`, `sheet`, `contextMenu`, `mapLayers`, `settings`, `exchange`. Оболочка рисует то, что в них зарегистрировано, и ничего не знает о конкретных функциях.
- **Включение при сборке:** `src/modes/<режим>/features.config.ts` — список манифестов. Убрать строку — функции нет в сборке. Проверка `requires` — тестом.
- **Включение на устройстве:** профили и роли (CORE-19) скрывают функции без пересборки.

## 5. Состояние, история, хранение

- **Store режима:** неизменяемое состояние в сигнале, собранное из срезов функций.
- **Команды:** любое изменение — `exec('fire', payload)`. Immer выдаёт патчи → история ↶/↷ (до 200 шагов), автосохранение с задержкой 500 мс.
- **IndexedDB** `skat2`: хранилища `projects` (по режимам), `assets` (картинки, шрифты, знаки, фото), `tiles`, `exchange` (входящие пакеты), `settings`, `errors`.
- **Загрузка:** проверка схемой zod → миграции по `version` среза → при порче — карантин записи и сообщение, без падения приложения.
- **Шифрование (CORE-15):** слой над хранилищем. Ключ данных AES-256-GCM, обёрнутый ключом из PIN (PBKDF2-SHA-256, ≥ 210 000 итераций). Тайлы не шифруются.
- **Файл проекта `.skat`:** ZIP (fflate): `manifest.json` {формат, версия, режим, создан, приложение}, `data.json`, `assets/`. Один формат для всех режимов, режим — в манифесте.

## 6. Модель данных (основа)

```ts
type LngLat = [lng: number, lat: number];          // WGS-84, порядок GeoJSON
type SK42 = { x: number; y: number; zone: number }; // метры, Гаусс–Крюгер
interface Meta { id: string /*ULID*/; created: number; updated: number; rev: number }

// Боевой контур
interface Situation { meta: Meta; name: string; area?: Bounds; layers: Layer[]; tasks: FireTask[] }
interface Layer { meta: Meta; name: string; kind: LayerKind; style: Style; hidden?: boolean; locked?: boolean; items: Item[] }
interface PointItem { meta: Meta; pos: LngLat; h?: number; sym?: SymRef; side?: 'own' | 'enemy';
                      label?: string; card?: Card; tags?: string[] }
interface Target extends PointItem { no: string /*01101*/; zone?: string; char?: string; tz: string[] }
interface FireTask { meta: Meta; gun: string; target: string; system: string; shots: Shot[]; status: TaskStatus }

// Оператор
interface OpDocument { meta: Meta; sheet: { scale: number; paper: Paper; zone: number; origin: SK42 };
                       basemap?: AssetRef; layers: OpLayer[]; palette: Color[]; styles: NamedStyle[]; fonts: AssetRef[] }
interface OpObject { meta: Meta; type: 'path' | 'rect' | 'ellipse' | 'text' | 'symbol' | 'table' | 'image' | 'group';
                     geom: PlaneGeom /*метры СК-42*/; style: Style; locked?: boolean; hidden?: boolean }

// Обмен (общий язык режимов)
interface LayerPacket { v: 1; id: string; from: { mode: Mode; project: string; at: number };
                        title: string; layers: { name: string; features: GeoJSON.Feature[] }[] }
```

Свойства `Feature` в пакете: `sym`, `side`, `label`, `style`, `no`, `char` и др. Каждый режим держит свой адаптер `exchange/toPacket.ts` / `fromPacket.ts`; внутренние модели режимов друг друга не знают.

## 7. Карта (`kit/map`)

- **MapEngine** — обёртка над MapLibre. Режимы не вызывают MapLibre напрямую; в тестах движок подменяется.
- **Отрисовка:**
  - массовые объекты — источники GeoJSON + знаки как спрайты (`kit/symbols` рисует SVG → `addImage`);
  - редактирование — SVG-оверлей в экранных координатах;
  - DOM-маркеры — только для единичных интерактивных элементов.
- **Тайлы:**
  - протокол `skat://` (`addProtocol`): кэш IndexedDB → сеть;
  - `.mbtiles` — sql.js в Web Worker;
  - заглушки поставщиков → увеличенный родительский тайл.
- **Сетка СК-42** — GeoJSON по видимой области, считается в Worker.
- **3D (только Макет):** `raster-dem` рельеф, здания `fill-extrusion`, модели — пользовательский слой на Three.js (лениво).

## 8. Обмен между режимами (`kit/exchange`)

- **Провайдеры:** режим объявляет их в манифестах функций (`provides: ['bk.situation', 'bk.targets', 'op.sheetImage']`). Провайдер работает по сохранённым данным, даже если режим-источник не открыт.
- **Запрос:** `exchange.request(provider, params)` → пакет `LayerPacket` → «Входящие» получателя.
- **Принятие:** копия в данные получателя с пометкой источника и времени. Кнопка «Обновить из источника» повторяет запрос.
- **Передача по инициативе источника:** «Передать в…» кладёт пакет во «Входящие» нужного режима.
- **Тот же пакет** сериализуется в файл, QR и сеть (CORE-17).

## 9. Интерфейс (`kit/ui`)

- **Тема «Ночное видение»:** токены CSS, тёмная по умолчанию.
- **Шрифты:** Golos Text — интерфейс, IBM Plex Sans Condensed — плотные числа и координаты; встроены в сборку.
- **Компоненты:** Button, IconButton, Field, CoordInput (ввод СК-42), Select, List (свайп-действия), Table, Sheet (нижний лист), Dock (выдвижные панели), Modal (одно окно за раз), Popover, Toast, Icon.
- **Две раскладки** у каждого режима:
  - `desktop` — ≥ 1024 px, мышь и клавиатура: панели как в CorelDRAW;
  - `touch` — телефон и планшет: нижняя панель, листы, кнопки ≥ 44 px.
- **Ввод:** только Pointer Events. Горячие клавиши — через единый реестр (`kit/ui/hotkeys`).

## 10. Структура репозитория

```
skat2/
├─ .github/workflows/  ci.yml · pages.yml · android.yml · windows.yml · apply-patch.yml · release.yml
├─ docs/               ARCHITECTURE.md · FEATURES.md · adr/
├─ inbox/              сюда загружается архив с изменениями
├─ platforms/android/  Capacitor: конфиг, иконки, разрешения
├─ platforms/windows/  Electron: main.ts, протокол app://
├─ public/             иконки, manifest, шрифты
├─ src/
│  ├─ core/            geo/ (sk42, mgrs, grid) · model/ · units/ · util/
│  ├─ platform/        storage/ · files/ · crypto/ · gps/ · share/
│  ├─ kit/             map/ · symbols/ · exchange/ · history/ · project/ · ui/
│  ├─ modes/
│  │  ├─ operator/     shell/ · features/ · exchange/ · features.config.ts · index.ts
│  │  ├─ combat/       …
│  │  ├─ maket/        …
│  │  └─ shtab/        …
│  └─ app/             main.ts · splash/ · lock/ · launcher/ · settings/ · migrate-v6/
├─ tests/e2e/          Playwright (unit-тесты лежат рядом с кодом)
├─ CLAUDE.md · README.md · CHANGELOG.md
└─ package.json · tsconfig.json · vite.config.ts · eslint.config.js · .dependency-cruiser.cjs
```

## 11. Качество — критерии готовности

- **Проверки:** `tsc --noEmit` (strict), ESLint, Prettier, dependency-cruiser.
- **Тесты:**
  - Vitest — `core` покрыт ≥ 90 %: СК-42 по эталонным точкам, нумерация целей, План ОЗ;
  - Playwright — смоук: запуск, вход в каждый режим, нет ошибок в консоли.
- **Бюджет размера:**
  - оболочка ≤ 150 КБ gzip без MapLibre;
  - каждый режим — отдельный ленивый чанк.
- **Цели производительности:**
  - 2000 знаков без рывков на среднем Android;
  - холодный старт: ≤ 2 с на ПК, ≤ 4 с на Android.
- **Ошибки:** граница ошибок на каждый режим; журнал ошибок на устройстве с выгрузкой.
- **Каждое изменение обновляет:**
  - версию и запись в CHANGELOG;
  - статус в FEATURES.md;
  - README функции.

## 12. Ветки, сборка, выпуск

- **Ветки:**
  - `dev` → бета: `…/skat2/beta/`;
  - `main` → стабильная: `…/skat2/`.

  Обе публикует `pages.yml` одним сайтом.
- **apply-patch.yml:** архив из `inbox/` → распаковка, удаление файлов по `_delete.txt`, все проверки → коммит в `dev` → бета.
- **release.yml** (кнопка «Run workflow» с iPhone):
  1. слияние `dev` → `main`, тег `v2.x.y`;
  2. сборка APK и EXE → GitHub Releases. Там файлы не истекают.
- **Сообщения коммитов:** `feat(BK-13): …`, `fix(OP-08): …`, `docs: …`.
- **Workflow-файлы** правятся вручную. Вариант по желанию: секрет `WORKFLOW_TOKEN` (fine-grained PAT с правами Contents + Workflows только на skat2) — тогда и они идут архивом. Токен хранится только в Secrets репозитория, в чат не передаётся.
- **Подпись APK:** ключ в секрете репозитория. Новый applicationId — СКАТ 2.0 ставится рядом с 6.x.

## 13. Перенос данных из 6.x (`app/migrate-v6`)

- **Веб:** тот же источник (github.io). Первый запуск читает `sk42_planshet_v1` и базу `skat`; если в 6.x включён PIN — спрашивает его (совместимый алгоритм 6.20).
- **APK/EXE:** через файл проекта 6.x.
- **Раскладка данных:**
  - обстановка, задачи, журнал → Боевой контур;
  - надписи, таблицы, фигуры → проект Оператора «Импорт из 6.x»;
  - объекты макета → Макет.
- **Тесты** — на реальных выгрузках 6.x.

## 14. План вех

| Веха | Содержание | Оценка, окон |
|---|---|---|
| M0 Проверка движка | MapLibre: 2000 знаков, офлайн-тайлы, .mbtiles, сетка СК-42, печать; выбор библиотек | ~0,5 |
| M1 Каркас — 2.0.0-alpha.1 | репо, CI/CD, inbox, оболочка, режимы-пустышки, хранилище, тема, заставка, PIN | 1–1,5 |
| M2 Ядро карты — alpha.2 | CORE-01…14, 16, 19 | 2–3 |
| M3 Боевой контур — beta | BK-01…03, 05…15, 17…22 | 3–4 |
| M4 Оператор-основа | OP-01…14, 18…21, 24 | 2–3 |
| **2.0.0** | перенос данных 6.x, стабилизация — можно уходить с 6.x | 0,5–1 |
| 2.1 Штаб | SH-01…03, 05…11 | 2–3 |
| 2.2 Макет | MK-01…04, 07, 11 | 1,5–2 |
| 2.3 Оператор+ | OP-15…17, 22 | 1–1,5 |
| 2.4 Обмен+ | CORE-17, OP-23 (.cdr) | 1,5–2 |
| позже | CORE-18, BK-04, BK-16, MK-05, MK-06, MK-08…10, SH-04 | по заказу |

Итого до 2.4: около 15–20 окон. Порядок вех можно менять, кроме M0 → M1 → M2.
