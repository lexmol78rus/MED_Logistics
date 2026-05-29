# PROJECT_CONTEXT — MED_Logistics (Medical Warehouse Management System)

Этот файл — “постоянная память” проекта для дальнейшей разработки: что где лежит, как устроено, как запускать, какие сервисы, какие модули и API.

## Архитектура (high-level)

- **Frontend**: React + Vite (SPA), UI на Tailwind + компоненты (shadcn/base-ui), таблицы на **AG Grid**, состояние в **Zustand**, данные/кеш в **TanStack React Query**.
- **Backend**: **NestJS** (REST API) + **Prisma** (ORM) + **PostgreSQL**.
- **Auth**: JWT access/refresh, роли пользователей (`ADMIN`, `MANAGER`, `OPERATOR`, `VIEWER`).
- **Deploy**: Docker Compose (dev + prod), **nginx** как reverse proxy и статическая раздача фронта.

Ключевая идея: браузер работает с backend по same-origin через nginx (`/api/...`), а backend имеет глобальный префикс `API_PREFIX` (по умолчанию `api/v1`).

## Структура репозитория

Проект находится в папке `MED_Logistics/`.

```text
MED_Logistics/
├── backend/                   # NestJS API + Prisma + migrations
├── frontend/                  # React/Vite SPA
├── deploy/                    # prod env, nginx config, hardening/verification, backup scripts
├── docker-compose.yml         # dev full-stack: postgres + api + web
├── docker-compose.prod.yml    # prod full-stack: postgres + api + web (env-file deploy/.env)
├── docs/                      # доп. документация (если добавится)
├── scripts/                   # вспомогательные скрипты (если добавится)
└── backup/                    # артефакты/копии (исторические)
```

## Бекапы (server snapshots)

- **Скрипт дампа Postgres (prod)**: `deploy/scripts/backup-postgres.sh`
  - Пишет gzip-дампы в `deploy/backups/` (папка в `.gitignore`)
  - Формат имени: `<db>_<UTC-timestamp>.sql.gz`, пример: `med_warehouse_20260528T104456Z.sql.gz`
- **Исторические копии (в репозитории)**: `backup/` (может включать .sql/.sql.gz, см. `backup/README.md`)

### Актуальный бекап за 2026-05-29

- **Архив кода на сервере**: `/home/adminmed/backups/2026-05-29/MED_Logistics_2026-05-29_20260529T140654Z.tar.gz`
- **Дамп БД (копия в репозитории)**: `backup/med_warehouse_prod_2026-05-29_20260529T140654Z.sql.gz`
- **Git ветка бекапа**: `backup/2026-05-29`

Предыдущий снимок: `backup/2-2026-05-28`, `2_med_warehouse_prod_2026-05-28_20260528T174122Z.sql.gz`.

## Backend (NestJS)

### Точки входа и конфигурация

- **Entrypoint**: `backend/src/main.ts`
  - глобальный префикс `apiPrefix` из конфигурации, default `api/v1`
  - global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`)
  - global `AllExceptionsFilter` (унифицирует ошибки, в т.ч. Prisma)
- **App module**: `backend/src/app.module.ts`
  - глобальные guards: **ThrottlerGuard**, **JwtAuthGuard**, **RolesGuard**
  - интерцептор: `IntegrationLoggingInterceptor`
- **Env + validation**:
  - `backend/src/config/configuration.ts` — маппинг env → typed config
  - `backend/src/config/validation.schema.ts` — Joi-валидация env на старте

### Основные модули (feature modules)

Реальные контроллеры находятся в `backend/src/modules/*/*.controller.ts`. Бизнес-логика — в сервисах соответствующих модулей.

- **Auth**: `auth` — login/refresh/forgot-password/reset-password/logout
- **Users**: `users` — `me`, CRUD, reset-password
- **Products**: `products` — список/деталка/создание/обновление + quick-create
- **Lots**: `lots` — список, recall по lotNumber, смена статуса/локации
- **Inventory**: `inventory` — баланс, приемка, списание, рекомендации (FEFO), корректировки
- **Movements**: `movements` — движения (операции по складу)
- **Expiry**: `expiry` — контроль сроков + summary
- **Expected receipts**: `expected-receipts` — ожидаемые поставки (ordered/received/close/cancel)
- **Writeoff destinations**: `writeoff-destinations` — справочник мест/типов списания
- **Scanner**: `scanner` — обработка данных сканера/штрихкодов
- **Barcode**: `barcodes` — список/поиск штрихкодов (по факту контроллера)
- **Notifications**: `notifications` — список + mark read
- **Audit**: `audit` — аудит-лог
- **Dashboard**: `dashboard` — summary
- **Export**: `export` — выгрузки (products/lots/movements/expiry)
- **Settings**: `settings` — общие настройки + mail-настройки + test mail
- **Health**: `health` — liveness/readiness

### База данных (Prisma + Postgres)

- Prisma schema: `backend/prisma/schema.prisma`
- Основные доменные сущности (не исчерпывающе):
  - `User`, `RefreshToken`, `PasswordResetToken`
  - `Product`, `Lot`, `InventoryItem`, `StockMovement`
  - `BarcodeRecord`
  - `WriteOffDestination`
  - `AuditLog`, `Notification`
  - `SystemSetting`
  - `ExpectedReceipt`, `ExpectedReceiptEvent`

Скрипты Prisma (см. `backend/package.json`):

- `npm run prisma:generate`
- `npm run prisma:migrate` (dev, `prisma migrate dev`)
- `npm run prisma:migrate:deploy` (prod/CI, `prisma migrate deploy`)
- `npm run prisma:studio`
- `npm run prisma:seed` (seed указан как `node prisma/seed.js`)

### Зависимости backend (ключевые)

Из `backend/package.json`:

- **NestJS**: `@nestjs/*` (core, common, config, jwt, passport, throttler)
- **DB**: `prisma`, `@prisma/client`, PostgreSQL через `DATABASE_URL`
- **Auth**: `passport`, `passport-jwt`, `bcrypt`
- **Validation**: `class-validator`, `class-transformer`, `joi`
- **Logging**: `nestjs-pino`, `pino-http`, `pino-pretty` (не prod)
- **Mail**: `nodemailer`

### Важные технические особенности backend

- **Глобальная защита роутов**: `JwtAuthGuard` включён глобально. Для публичных роутов используется декоратор `@Public()` (напр. `auth/*`, `health/*`).
- **RBAC**: роли задаются декоратором `@Roles(...)` и проверяются `RolesGuard`. Константы ролей: `backend/src/common/constants/roles.ts`.
- **Rate limiting**: `@nestjs/throttler` (плюс на `forgot-password` отдельный лимит в контроллере).
- **Uploads**: в prod compose монтируется `/app/uploads` (см. `docker-compose.prod.yml`), а entrypoint создаёт директории `uploads` и `uploads/ru` (`backend/docker-entrypoint.sh`).
- **SETTINGS_ENCRYPTION_KEY**: в production обязателен (Joi min 32). Используется для безопасного хранения чувствительных кусков в `SystemSetting` (например SMTP пароль).

## Frontend (React + Vite)

### Точки входа и конфигурация

- Entrypoint: `frontend/src/main.tsx`
  - миграция settings storage: `migrateSettingsStorage()`
  - регистрация модулей AG Grid (`ModuleRegistry.registerModules([AllCommunityModule])`)
- Vite config: `frontend/vite.config.ts`
  - alias `@` указывает на корень `frontend/`
  - есть механизм `.env.build` для build metadata (`VITE_APP_BUILD`, `VITE_APP_BUILD_COMMIT`)
  - HMR может отключаться через `DISABLE_HMR=true` (особенность окружения AI Studio/агентских правок)
- API base URL: `frontend/src/config/env.ts`
  - `apiBaseUrl` берётся из `VITE_API_URL` (обрезает trailing slash), default `/api/v1`

### Доступ к API и сессии

- Клиент: `frontend/src/lib/api/client.ts`
  - добавляет `Authorization: Bearer <accessToken>`
  - при `401` пытается **refresh** (`/auth/refresh`), затем ретраит исходный запрос
  - при неуспехе — очищает auth store и редиректит на `/login`
  - ошибки мапятся в UI-сообщения (`mapApiMessageForUi`)
  - для `PATCH /settings...` есть “guard” финализации тела запроса (`finalizeSettingsPatchBody`)

### Зависимости frontend (ключевые)

Из `frontend/package.json`:

- **React 19**, **react-router-dom**
- **@tanstack/react-query**
- **zustand**
- **ag-grid-community / ag-grid-react**
- **tailwindcss v4** (+ `@tailwindcss/vite`)
- **shadcn**, `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`
- Присутствует `@google/genai` (Gemini) — потенциальные AI-фичи/заготовки (см. `.env.example`).

## API (REST)

Все маршруты ниже предполагают глобальный префикс `API_PREFIX` (по умолчанию `/api/v1`).

### Health

- `GET /health/live`
- `GET /health/ready`

### Auth

- `POST /auth/login` (public)
- `POST /auth/refresh` (public)
- `POST /auth/forgot-password` (public, throttled: 5/min)
- `POST /auth/reset-password` (public)
- `POST /auth/logout`

### Users

- `GET /users/me`
- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `POST /users/:id/reset-password`
- `DELETE /users/:id`

### Products

- `GET /products`
- `GET /products/:id`
- `POST /products`
- `POST /products/quick-create`
- `PATCH /products/:id`

### Product RU (регистрационные удостоверения)

Контроллер: `products/:productId/ru`

- `GET /products/:productId/ru`
- `POST /products/:productId/ru`
- `GET /products/:productId/ru/:certId/file`
- `DELETE /products/:productId/ru/:certId`

### Lots

- `GET /lots`
- `GET /lots/recall/:lotNumber`
- `PATCH /lots/:id/status`
- `PATCH /lots/:id/location`

### Inventory

- `GET /inventory`
- `GET /inventory/balance`
- `GET /inventory/reconcile` (admin only)
- `GET /inventory/writeoff/recommendation`
- `POST /inventory/receive`
- `POST /inventory/writeoff`
- `POST /inventory/writeoff/batch`
- `POST /inventory/writeoff/correct` (admin/manager)

### Movements / Expiry / Dashboard / Audit / Notifications / Scanner / Barcode

- `GET /movements`
- `GET /expiry`
- `GET /expiry/summary`
- `GET /dashboard/summary`
- `GET /audit`
- `GET /notifications`
- `PATCH /notifications/read-all`
- `PATCH /notifications/:id/read`
- `POST /scanner/process`
- `GET /barcodes`

### Expected receipts

- `GET /expected-receipts`
- `GET /expected-receipts/active`
- `POST /expected-receipts`
- `PATCH /expected-receipts/:id`
- `POST /expected-receipts/:id/close`
- `POST /expected-receipts/:id/cancel`
- `DELETE /expected-receipts/:id`

### Writeoff destinations

- `GET /writeoff-destinations`
- `POST /writeoff-destinations`
- `PATCH /writeoff-destinations/:id`
- `DELETE /writeoff-destinations/:id`

### Export

- `GET /export/products`
- `GET /export/lots`
- `GET /export/movements`
- `GET /export/expiry`

### Settings

- `GET /settings`
- `PATCH /settings`
- `GET /settings/mail`
- `PATCH /settings/mail`
- `POST /settings/mail/test`

## Docker окружение

### Dev full-stack (`MED_Logistics/docker-compose.yml`)

Сервисы:

- **postgres**: `postgres:16-alpine`, порт `5432:5432`, volume `med_warehouse_pg`
- **api**: сборка из `./backend`, порт `3000:3000`, healthcheck `/api/v1/health/live`
- **web**: сборка `frontend/Dockerfile`, порт `80:80` (nginx)

В dev compose для `api` передаются env напрямую (в т.ч. `DATABASE_URL`, `JWT_*`, throttling).

### Prod full-stack (`MED_Logistics/docker-compose.prod.yml`)

- Использует `--env-file deploy/.env`
- Присутствуют дополнительные переменные (SMTP, `SETTINGS_ENCRYPTION_KEY`, volume для uploads)
- В `web` build args прокидываются `VITE_API_URL`, `VITE_APP_ENV`

### Nginx

Конфиг: `deploy/nginx/default.conf`

- `location /api/` проксирует на upstream `api:3000` (путь сохраняется, т.е. `/api/v1/...` попадает в Nest)
- SPA fallback: `try_files ... /index.html`
- агрессивное кеширование `/assets/*`, а `index.html` и `version.json` — без кеша
- health endpoint: `GET /health` → `200 ok` (для контейнерного healthcheck)

### Dockerfiles

- `backend/Dockerfile`: multi-stage, Node 20, reuse `node_modules` из deps (важно для `bcrypt`), `prisma generate`, build в `dist/`, entrypoint создаёт uploads и запускает под пользователем `node`.
- `frontend/Dockerfile`: build Vite, затем nginx runtime.

## Как запускать проект

### Вариант A: Docker Compose (рекомендуется для “как в проде”)

Из `MED_Logistics/`:

```bash
docker compose up --build
```

Проверки:

- Web: `http://localhost/health`
- API: `http://localhost/api/v1/health/live`
- API ready: `http://localhost/api/v1/health/ready`

### Вариант B: Локально без Docker (dev)

#### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run start:dev
```

#### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Важно: по умолчанию **и backend, и frontend dev хотят порт 3000**.
Обычно решают так:

- либо изменить порт фронта (в `frontend/package.json` скрипт `vite --port=...`),
- либо запускать backend на другом `PORT`,
- либо использовать docker (web на 80, api на 3000).

## Важные технические особенности / “грабли”

- **Глобальный API prefix**: всегда учитывайте `API_PREFIX` (default `api/v1`). В docker/nginx запросы обычно выглядят как `/api/v1/...`.
- **CORS**: при same-origin (nginx) обычно не нужен. Если фронт живёт на другом origin — нужно включать CORS в `backend/src/main.ts`.
- **401 → refresh**: фронт автоматически делает refresh сессии; при ошибке — принудительный logout и переход на `/login`.
- **RBAC + Guards**: большинство маршрутов требуют JWT и соответствующую роль; при интеграциях не забывайте `Authorization`.
- **Migrations при старте**: в docker образе backend заложен `prisma migrate deploy` перед запуском (`CMD` в `backend/Dockerfile`).
- **Production hardening**: см. `deploy/PRODUCTION_HARDENING.md` и `deploy/ENV_VERIFICATION_SUMMARY.md` (backup, healthchecks, секреты, эксплуатация).
- **Root README**: `MED_Logistics/README.md` выглядит как шаблон AI Studio и может быть неактуален для текущего приложения; ориентируйтесь на `backend/README.md`, compose файлы и `deploy/*`.

