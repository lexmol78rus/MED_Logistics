# Резервные копии БД

| Файл | Дата | Описание |
|------|------|----------|
| `med_warehouse_prod_2026-05-30_20260530T112106Z.sql.gz` | 2026-05-30 | Полный дамп production (RBAC permissions, role templates, accountant role, per-user permission overrides). Локальный архив кода: `/home/adminmed/backups/2026-05-30/MED_Logistics_2026-05-30_20260530T112106Z.tar.gz`. Git: `backup/2026-05-30`. |
| `med_warehouse_prod_2026-05-29_20260529T140654Z.sql.gz` | 2026-05-29 | Полный дамп production (shipments assembly/reservations, product GTIN, product names catalog, GS1 scan). Локальный архив кода: `/home/adminmed/backups/2026-05-29/MED_Logistics_2026-05-29_20260529T140654Z.tar.gz`. Git: `backup/2026-05-29`. |
| `2_med_warehouse_prod_2026-05-28_20260528T174122Z.sql.gz` | 2026-05-28 | Полный дамп production **перед** очисткой Docker cache (shipments, counterparties, picking/writeoff). Локальный архив кода: `/home/adminmed/backups/2026-05-28/2_MED_Logistics_2026-05-28_20260528T174122Z.tar.gz`. Git: `backup/2-2026-05-28`. |
| `med_warehouse_prod_2026-05-25_pre-nomenclature-clean.sql` | 2026-05-25 | Полный дамп production **перед** первой очисткой (17 products, 71 movements, …). |
| `med_warehouse_prod_2026-05-25_round2_pre-nomenclature-clean.sql` | 2026-05-25 | Дамп **перед** второй очисткой (1 product, 4 movements, 7 audit, …). |
| `med_warehouse_prod_2026-05-25_post-warehouse-locations.sql` | 2026-05-25 | Дамп production **после** включения адресного хранения (номенклатура, ячейки, РУ, UI). |

## Восстановление (откат)

```bash
# Остановить API на время восстановления (по желанию)
sg docker -c 'docker exec -i med_warehouse_db_prod psql -U med_warehouse -d med_warehouse < backup/med_warehouse_prod_2026-05-25_pre-nomenclature-clean.sql'
```

Или из корня репозитория:

```bash
cat backup/med_warehouse_prod_2026-05-25_pre-nomenclature-clean.sql | \
  sg docker -c 'docker exec -i med_warehouse_db_prod psql -U med_warehouse -d med_warehouse'
```

**Внимание:** восстановление перезапишет текущие данные в БД `med_warehouse`.

## После дампа (2026-05-25)

На production дополнительно очищены (пустые таблицы):

- вся номенклатура и связанные партии / остатки / движения / поставки;
- **все** записи `audit_logs` и `notifications` (пользователи, настройки, направления списания не затрагивались).

## Вторая очистка (2026-05-25, round 2)

Удалено на production:

| Данные | Удалено |
|--------|---------|
| Номенклатура | 1 |
| Штрихкоды | 2 |
| Движения | 4 |
| Аудит | 7 |
| Уведомления | 1 |

**Не тронуто:** 14 пользователей, 9 направлений списания, системные настройки.
