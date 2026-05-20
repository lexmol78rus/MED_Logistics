# Medical Warehouse API (NestJS)

Production-oriented API skeleton for the Medical Warehouse Management System. It provides REST structure, PostgreSQL via Prisma, JWT-based guards (no credential flow yet), validation, structured logging, and Docker.

## Requirements

- Node.js 18+
- PostgreSQL 14+ (or use Docker Compose below)

## Quick start (local)

```bash
cd backend
cp .env.example .env
# Adjust DATABASE_URL and JWT secrets in .env
npm install
npm run prisma:migrate
npm run start:dev
```

The API listens on `http://localhost:3000` unless `PORT` is set. All business routes are under the global prefix from `API_PREFIX` (default `api/v1`).

## Environment

Copy `.env.example` to `.env`. Variables are validated at startup with Joi (`src/config/validation.schema.ts`).

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection URL for Prisma |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing (min 32 chars in `NODE_ENV=production`) |
| `API_PREFIX` | REST prefix, default `api/v1` |
| `LOG_LEVEL` | Pino log level (`info`, `debug`, …) |

## Architecture

```text
backend/
├── prisma/
│   ├── schema.prisma          # Domain models (catalog, lots, inventory, barcode, audit, notifications)
│   └── migrations/            # SQL migrations (deploy with prisma migrate deploy)
├── src/
│   ├── common/                # Guards, filters, shared DTOs
│   ├── config/               # configuration() + Joi validation schema
│   ├── prisma/               # PrismaService (global module)
│   └── modules/
│       ├── auth/             # JWT strategy + login placeholder (501)
│       ├── users/
│       ├── products/         # Stubs ready for catalog rules
│       ├── lots/             # Includes expiry index for future FEFO
│       ├── inventory/
│       ├── barcode/          # Hook for scanner resolution
│       ├── audit/
│       ├── notifications/
│       └── health/            # liveness & readiness (DB ping)
├── Dockerfile
└── docker-compose.yml
```

### Cross-cutting concerns

- **Validation:** `class-validator` + global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).
- **Errors:** `AllExceptionsFilter` unifies HTTP and Prisma known errors (`src/common/filters/all-exceptions.filter.ts`).
- **Logging:** `nestjs-pino` request + app logging; pretty transport only outside production.
- **Auth:** `JwtAuthGuard` is registered globally; use `@Public()` for open routes (`auth/login`, `health/*`).
- **REST:** Feature modules expose `GET` list placeholders returning empty pagination until domain logic is added.

## Database

```bash
npm run prisma:generate
npm run prisma:migrate        # dev: creates new migrations
npm run prisma:migrate:deploy # CI/prod: apply existing migrations
npm run prisma:studio         # optional DB UI
```

Initial migration: `20250520090000_init`.

## Docker

From `backend/`:

```bash
docker compose up --build
```

- **postgres** — port `5432`, database `med_warehouse`.
- **api** — port `3000`, runs `prisma migrate deploy` then `node dist/main.js`.
- **Health:** `GET /api/v1/health/live` (liveness), `GET /api/v1/health/ready` (DB check).

Replace JWT secrets and credentials for anything beyond local development.

## Calling protected routes

Issue tokens using `AuthService.issueAccessTokenForUser()` from a future login/seed flow. Until login is implemented, requests to `/api/v1/users/me`, `/api/v1/products`, etc. require a valid `Authorization: Bearer <access_token>`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled app |
| `npm run lint` | ESLint |

## Frontend integration

The existing frontend is unchanged. Point its API base URL to this service (including `API_PREFIX`). CORS is not enabled by default; add `app.enableCors(...)` in `main.ts` when the browser origin is known.
