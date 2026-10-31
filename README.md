# СКАТ 2.0

Полевой топопланшет СК-42. Четыре независимых режима: Оператор, Боевой контур, Макет, Штаб.

- Стабильная: https://984s2pbyn4-create.github.io/skat2/
- Бета: https://984s2pbyn4-create.github.io/skat2/beta/
- Релизы: https://github.com/984s2pbyn4-create/skat2/releases

## Документы

- `CLAUDE.md` — правила работы над проектом.
- `docs/ARCHITECTURE.md` — архитектура и решения.
- `docs/FEATURES.md` — каталог функций.
- `CHANGELOG.md` — журнал изменений.

## Как приходят изменения

1. Claude собирает архив `skat2-<версия>.zip`.
2. Архив загружается в корень ветки `main`: Add file → Upload files → Commit.
3. Action `apply-patch` применяет его к `dev`, прогоняет проверки и публикует бету.

## Команды

- `npm ci` — установка зависимостей.
- `npm run dev` — запуск для разработки.
- `npm run check` — типы, линтер, формат, границы модулей, тесты.
- `npm run build` — сборка в `dist/`.

`.npmrc` содержит `legacy-peer-deps=true`: обход ошибки npm 10 при разборе необязательных зависимостей Vitest.
