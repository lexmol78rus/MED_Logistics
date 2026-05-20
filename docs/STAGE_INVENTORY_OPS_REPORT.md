# Stage: Inventory Consistency & Warehouse Terminal — Validation Report

**Date:** 2026-05-20  
**Scope:** MED_Logistics incremental production-safe changes

---

## 1. Inventory consistency status

| Capability | Status | Notes |
|------------|--------|-------|
| Canonical balance engine | **Implemented** | `computeInventoryBalance()` — total, available, blocked, quarantined, expired, reserved |
| `GET /api/v1/inventory/balance` | **Implemented** | Filters: productId, lotId, status, expiry, location |
| Balance wired to list | **Implemented** | `GET /inventory` delegates to balance engine |
| Products use available qty | **Implemented** | `availableQty`, `lowStock` on product list |
| Writeoff uses available qty | **Implemented** | Validation + FEFO recommendation |
| Negative stock prevention | **Implemented** | `InventoryValidationService` on writeoff |
| Blocked/quarantine writeoff block | **Implemented** | Server-side guards |
| FEFO violation logging | **Implemented** | Audit `inventory.fefo.violation`; strict mode from settings |
| Movement reconciliation | **Implemented** | `GET /inventory/reconcile` (ADMIN) |
| Reserved quantity | **Partial** | Column `reserved_quantity` on items; default 0 until reservation workflow |

**Formula enforced:** `available = total - blocked - quarantined - expired - reserved`

---

## 2. Operational safety status

| Capability | Status | Location |
|------------|--------|----------|
| Destructive confirm dialogs | **Implemented** | WriteOff, Terminal writeoff |
| Retry queue on offline failure | **Implemented** | `lib/ops/retry-queue.ts` |
| Connection lost banner | **Implemented** | `ConnectionBanner` in Layout |
| Optimistic rollback | **N/A** | Mutations use server truth; failed writes show toast + retry queue |
| JWT refresh retry | **Existing** | `apiFetch` client |

---

## 3. TSD readiness

| Capability | Status | Route |
|------------|--------|-------|
| Terminal mode UI | **Implemented** | `/terminal` — dark full-screen, large controls |
| Receiving flow | **Implemented** | Scan → lot → expiry → qty → submit |
| Writeoff FEFO | **Implemented** | Scan → FEFO confirm dialog |
| Lot / product lookup | **Implemented** | Navigate from scan |
| Scanner sounds | **Implemented** | Web Audio beeps (configurable) |
| Auto-focus restore | **Implemented** | `useScannerField` |
| Duplicate scan prevention | **Implemented** | 800ms debounce per value |
| Scan queue | **Implemented** | Serial promise queue |
| Global scanner hardening | **Implemented** | Header scanner updated |

**Roles:** ADMIN, MANAGER, OPERATOR (not VIEWER)

---

## 4. Admin & persistence

| Capability | Status |
|------------|--------|
| Audit UI `/audit` | **Implemented** — AG Grid, filters, CSV export, ADMIN only |
| `system_settings` table | **Migration** `20250520200000_inventory_ops_stage` |
| `GET/PATCH /settings` | **Implemented** — PATCH audited |
| Notifications persistence | **Implemented** — DB upsert by stable id; read/mark read |
| Low stock (`minStock`, `reorderPoint`) | **Schema + API** — dashboard KPI + notification sync |
| Notifications for all roles | **Implemented** — `READ_ROLES` on GET |

---

## 5. E2E workflow checklist (manual)

Run after `docker compose up --build` and `prisma migrate deploy`:

### ADMIN
- [ ] Login `admin@med.local` / `Warehouse123!`
- [ ] Users CRUD, reset password
- [ ] Settings PATCH → verify audit `settings.update`
- [ ] Audit page filters + export
- [ ] `GET /inventory/reconcile`

### MANAGER
- [ ] Recall/block lot → verify balance blocked qty
- [ ] Export CSV
- [ ] Notifications: expiring, low stock

### OPERATOR
- [ ] `/terminal` receive → dashboard qty increases
- [ ] FEFO writeoff → movement ISSUE
- [ ] Scanner: REF, barcode, LOT

### VIEWER
- [ ] Read-only routes; no `/terminal`, `/receiving`, `/write-off`

### Warehouse flow
1. Create product (set minStock)
2. Receive inventory
3. Scan product in terminal
4. FEFO writeoff
5. Quarantine lot → available = 0
6. Audit trail entries present
7. Notifications persisted after restart
8. `GET /inventory/balance?productId=...` matches UI

---

## 6. Remaining production risks

1. **Docker/migration not verified in CI** — run `prisma migrate deploy` on deploy.
2. **Reserved quantity** — no business workflow yet; always 0.
3. **Notification sync** — runs on each list fetch; high traffic may need background job.
4. **Terminal outside main layout** — no ConnectionBanner on `/terminal` (add if needed).
5. **Barcode admin** — `GET /barcodes` still stub.
6. **True XLSX export** — still CSV bytes for xlsx format param.
7. **Multi-warehouse** — single `system_settings` row.

---

## 7. Recommended scaling path

1. **Phase A:** Background worker for notification sync + reconciliation (cron).
2. **Phase B:** Reservation API (allocate `reserved_quantity` on pick lists).
3. **Phase C:** Redis cache for balance aggregates; read replicas for reporting.
4. **Phase D:** Dedicated TSD PWA with offline IndexedDB + sync queue.
5. **Phase E:** Multi-warehouse `warehouse_id` on inventory_items + settings per site.

---

## Key files

**Backend**
- `backend/src/common/utils/inventory-balance.util.ts`
- `backend/src/modules/inventory/inventory-balance.service.ts`
- `backend/src/modules/inventory/inventory-validation.service.ts`
- `backend/src/modules/settings/*`
- `backend/prisma/migrations/20250520200000_inventory_ops_stage/`

**Frontend**
- `frontend/src/pages/Terminal.tsx`
- `frontend/src/pages/Audit.tsx`
- `frontend/src/lib/scanner/useScannerField.ts`
- `frontend/src/components/ops/ConnectionBanner.tsx`
