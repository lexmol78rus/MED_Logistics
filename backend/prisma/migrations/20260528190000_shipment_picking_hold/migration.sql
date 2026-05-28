-- Pause / recall picking workflow
ALTER TYPE "ShipmentStatus" ADD VALUE 'PICKING_ON_HOLD';

ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "warehouse_message" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "picking_paused_at" TIMESTAMP(3);
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "picking_recalled_at" TIMESTAMP(3);
