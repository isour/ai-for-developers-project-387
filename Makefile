# Требуется GNU Make, Node >=20 (см. contracts/package.json и frontend/package.json) и npm в PATH.
# Не даём Go автоматически скачивать другой toolchain (в CI/песочнице это часто «висит» минутами).
export GOTOOLCHAIN := local

.PHONY: install contracts dev dev-local docker-build docker-run cursor-with-local-env frontend-lint frontend-build frontend-dev frontend-e2e frontend-e2e-install prism-mock backend-run backend-build backend-test backend-test-compile

# Установка зависимостей во всех JS-проектах репозитория (contracts, frontend).
install:
	cd contracts && npm install
	cd frontend && npm install

# Сборка OpenAPI из TypeSpec (contracts/openapi/openapi.yaml).
contracts:
	cd contracts && npm run compile

# Mock API по OpenAPI (подними до `make frontend-dev`: Vite проксирует /guest и /owner сюда).
prism-mock:
	cd contracts && npm run prism:mock

# Prism (порт 4010) и Vite одной командой; остановка — Ctrl+C (завершает оба процесса в группе).
dev:
	trap 'kill 0' INT TERM; \
	cd $(CURDIR)/contracts && npm run prism:mock & \
	cd $(CURDIR)/frontend && npm run dev & \
	wait

# Go-бэкенд и Vite; фронт ходит в API напрямую (не Prism). Порты должны совпадать при переопределении.
BACKEND_ADDR ?= :4000
VITE_API_BASE_URL ?= http://127.0.0.1:4000

dev-local:
	trap 'kill 0' INT TERM; \
	cd $(CURDIR)/backend && BACKEND_ADDR=$(BACKEND_ADDR) go run ./cmd/server & \
	cd $(CURDIR)/frontend && VITE_API_BASE_URL=$(VITE_API_BASE_URL) npm run dev & \
	wait

# Образ продакшена: один процесс Go (API + статика Vite). Порт внутри контейнера задаётся PORT (как на Render).
DOCKER_IMAGE ?= calendar-calls:local

docker-build:
	docker build -t $(DOCKER_IMAGE) .

docker-run:
	docker run --rm -p 8080:8080 -e PORT=8080 $(DOCKER_IMAGE)

# Render MCP в .cursor/mcp.json читает только ${env:RENDER_API_KEY} из окружения процесса Cursor, не из .env.local.
# Полностью закрой Cursor, затем из корня репозитория: make cursor-with-local-env — подхватит .env.local и откроет проект (CLI в PATH).
cursor-with-local-env:
	@test -f $(CURDIR)/.env.local || (echo 'Нет $(CURDIR)/.env.local — создайте файл с RENDER_API_KEY=...'; exit 1)
	@set -a && . $(CURDIR)/.env.local && set +a && cursor "$(CURDIR)"

frontend-dev:
	cd frontend && npm run dev

frontend-lint:
	cd frontend && npm run lint

frontend-build:
	cd frontend && npm run build

# Установка браузеров Playwright (Chromium + системные зависимости на Linux). Один раз после npm install.
frontend-e2e-install:
	cd frontend && npx playwright install --with-deps chromium

# Интеграционные e2e: поднимают Go и Vite через playwright.config.ts (см. frontend/playwright.config.ts).
frontend-e2e:
	cd frontend && npx playwright test

backend-run:
	cd backend && go run ./cmd/server

backend-build:
	cd backend && go build ./...

# Компиляция всех пакетов и тестов без запуска тестов (быстрая проверка для агента и pre-commit).
backend-test-compile:
	cd backend && go test -run '^$$' ./...

backend-test:
	cd backend && go test ./... -count=1 -timeout=60s
