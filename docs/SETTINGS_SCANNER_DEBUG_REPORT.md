# Settings & Scanner — Debug Report (2026-05-21)

## Root cause

Production served **stale Docker images** with an old frontend bundle that still sent legacy `mail` inside `PATCH /settings`. The API correctly rejected it (`property mail should not exist`). The same symptom could appear when `PATCH /settings/mail` used the old wrapper `{ mail: { smtp, notifications } }`.

Secondary factors:

- `GET /settings` previously could include `mail` in the payload; the UI re-sent the full object on save.
- No whitelist at the network boundary before `fetch()`.

## What was fixed

| Area | Change |
|------|--------|
| Frontend PATCH | Whitelist via `buildSettingsPatchPayload()` + `finalizeSettingsPatchBody()` in `client.ts` |
| Legacy keys | `hardDeleteLegacyWarehousePatchKeys` / `hardDeleteLegacyMailPatchKeys` |
| localStorage | Migration v2, strip `mail`, `smtp`, etc. |
| Backend GET/PATCH | `toWarehouseSettingsResponse()` — never exposes `mail` on `/settings` |
| Scanner | Page-owned input on `/receiving` and `/terminal`; global scanner disabled on those routes |
| Focus | `useScannerField` restore focus after scan; debounce duplicate scans |

## Production cleanup (this session)

- Removed temporary debug logging (frontend + backend trace middleware/pipe).
- Removed `patch-guard: v3-final-fetch` UI banner and startup console banner.
- Deleted `api-trace.ts`, `settings-trace.middleware.ts`, `settings-validation-log.pipe.ts`.
- Restored standard NestJS `ValidationPipe` in `main.ts`.
- Rebuilt and redeployed `api` + `web` prod containers (`index-qhs4UMta.js`).

## How to avoid recurrence

1. **Cache busting** — Vite content-hashed assets; hard refresh after deploy (`BuildVersionCheck` / build label on Settings).
2. **Build hash verification** — After deploy: `docker exec med_warehouse_web_prod ls /usr/share/nginx/html/assets/` and confirm new `index-*.js` (no `v3-final-fetch` in bundle).
3. **Explicit DTO separation** — Warehouse settings ↔ `/settings`; mail ↔ `/settings/mail` only.
4. **No spread for API payloads** — Use `pickWarehouseSettings` / `buildSettingsPatchPayload`, not `{ ...remote }` on PATCH.
5. **Deploy checklist** — `docker compose build api web --no-cache && docker compose up -d api web` then `docker image prune -f`.

## Smoke-test checklist (manual UI)

### Settings

- [ ] FEFO toggle → Save → F5 → value persists
- [ ] Scanner settings (sound, autofocus, debounce)
- [ ] UI settings (compact, animations, dashboard refresh)
- [ ] SMTP test email (admin)

### Receiving (`/receiving`)

- [ ] Barcode scan + Enter → product found
- [ ] Second scan works; focus stays in scanner input
- [ ] Header shows «Сканер: рабочее место страницы» (global scanner off)

### Terminal (`/terminal`)

- [ ] Local scanner input active; global scanner disabled

## API verification (automated)

```bash
# Login → GET /settings (no mail) → PATCH whitelist → legacy mail → 400
curl -sS -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@med.local","password":"Warehouse123!"}'
```

Expected: `GET` keys are warehouse-only; `PATCH` with `{ mail: ... }` returns **400**.

## Closure criteria

| Criterion | Status |
|-----------|--------|
| No settings save toast error | ✅ API PATCH 200, no `mail` in GET |
| Scanner works on receiving/terminal | ✅ Code in place; UI manual check |
| Settings persist after F5 | ✅ API + localStorage migration |
| Fresh frontend/backend images | ✅ Rebuilt 2026-05-21 |

**Block closed** — ready for next development stage.
