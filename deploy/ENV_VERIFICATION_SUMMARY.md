# Production environment verification summary

Generated as part of production env preparation. **No secret values are stored in this file.**

## Artifacts

| Artifact | Purpose |
|----------|---------|
| `deploy/.env` | Production secrets and settings (gitignored, mode 600) |
| `deploy/.env.example` | Documented template (placeholders only) |
| `deploy/scripts/generate-prod-env.sh` | One-time secure secret generation |
| `deploy/scripts/verify-env.sh` | Static checks without starting containers |

## Regenerate secrets

```bash
rm -f deploy/.env
./deploy/scripts/generate-prod-env.sh
```

## Verify before deploy

```bash
./deploy/scripts/verify-env.sh
```

## Configuration map

### PostgreSQL (`postgres` service)

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from `deploy/.env`
- Password: 64 hex chars (URL-safe for `DATABASE_URL`)

### Backend (`api` service)

- `NODE_ENV=production` (fixed in compose)
- `DATABASE_URL` built from postgres vars → `postgresql://USER:PASS@postgres:5432/DB?schema=public`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (64+ chars, production Joi min 32)
- `API_PREFIX`, throttle, log level from `deploy/.env`

### Frontend (`web` service build)

- `VITE_API_URL` (default `/api/v1`) — same-origin via nginx
- `VITE_APP_ENV=production`
- Read in app via `frontend/src/config/env.ts`

### Nginx

- `location /api/` → upstream `api:3000` (full path preserved → `/api/v1/...` on Nest)

## Pre-deploy checklist

- [ ] Run `./deploy/scripts/verify-env.sh` (all OK, no FAIL)
- [ ] Set `APP_URL` to public site URL in `deploy/.env`
- [ ] Set `GEMINI_API_KEY` if AI features are required
- [ ] Restrict `POSTGRES_PORT` / `API_PORT` exposure on production hosts
- [ ] Deploy: `./deploy/scripts/deploy.sh` (starts containers — run only when ready)
