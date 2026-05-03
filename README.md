### Hexlet tests and linter status:
[![Actions Status](https://github.com/isour/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/isour/ai-for-developers-project-386/actions)

### Деплой (Docker / Render)

- Сборка образа: **`make docker-build`** (или `docker build -t calendar-calls:local .`).
- Локальный запуск как в проде: **`make docker-run`** — приложение слушает **`PORT`** (по умолчанию `8080` внутри контейнера, проброшен на хост).
- На **Render**: Web Service с **Docker**, корневой [`Dockerfile`](Dockerfile); **`PORT`** выставляет платформа. Опционально Blueprint [`render.yaml`](render.yaml).
- **Опубликованное приложение:** [https://calendar-calls.onrender.com](https://calendar-calls.onrender.com) (Docker Web Service, дашборд: [calendar-calls](https://dashboard.render.com/web/srv-d7qb223rjlhs73ebr1j0)).

### Frontend (моки календаря)

- Путь: **`frontend/`**. Node **≥20** (см. `frontend/package.json`).
- Установка зависимостей по всему репо: **`make install`** (или вручную `npm install` в `contracts/` и `frontend/`).
- Разработка: **`make frontend-dev`** (или `cd frontend && npm run dev`).
- Сборка и линт: `make frontend-build`, `make frontend-lint`.

Контракты API описаны в **`contracts/openapi/openapi.yaml`**; текущий интерфейс ходит в in-memory моки (`frontend/src/shared/api/guest-api.ts`).

### MCP (Cursor)

Проектный конфиг: **[`.cursor/mcp.json`](.cursor/mcp.json)** — **shadcn**, **Chrome DevTools**, **Playwright** (запуск через `npx`).

1. **Cursor Settings → MCP** — включи нужные серверы для этого workspace (при необходимости перезапусти Cursor).
2. При первом запуске `npx` подтянет пакеты из npm. Если Playwright попросит браузеры, выполни вручную **`npx playwright install`** (или только `chromium`) — см. [документацию Playwright](https://playwright.dev/docs/intro).