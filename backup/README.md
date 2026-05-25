# Резервные копии БД

| Файл | Дата | Описание |
|------|------|----------|
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
