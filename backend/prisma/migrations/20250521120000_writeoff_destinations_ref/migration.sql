-- CreateTable
CREATE TABLE "write_off_destinations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "legacy_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "write_off_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "write_off_destinations_legacy_code_key" ON "write_off_destinations"("legacy_code");

-- Seed default destinations (legacy codes map old enum values)
INSERT INTO "write_off_destinations" ("id", "name", "type", "is_active", "legacy_code", "created_at", "updated_at") VALUES
  ('wod_disposal', 'Утилизация', 'DISPOSAL', true, 'DISPOSAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wod_defect', 'Брак', 'DAMAGE', true, 'DEFECT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wod_internal', 'Внутреннее потребление', 'INTERNAL', true, 'INTERNAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wod_other', 'Другое', 'OTHER', true, 'OTHER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wod_department', 'Отделение / кабинет', 'INTERNAL', true, 'DEPARTMENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wod_samples', 'Тест / образцы', 'SAMPLES', true, 'SAMPLES', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wod_damage', 'Повреждение', 'DAMAGE', true, 'DAMAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wod_expired', 'Истёк срок годности', 'OTHER', true, 'EXPIRED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN "write_off_destination_id" TEXT;

-- Backfill FK from legacy text codes
UPDATE "stock_movements" sm
SET "write_off_destination_id" = d."id"
FROM "write_off_destinations" d
WHERE sm."write_off_destination" IS NOT NULL
  AND sm."write_off_destination" = d."legacy_code"
  AND sm."write_off_destination_id" IS NULL;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_write_off_destination_id_fkey" FOREIGN KEY ("write_off_destination_id") REFERENCES "write_off_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "stock_movements_write_off_destination_id_idx" ON "stock_movements"("write_off_destination_id");
