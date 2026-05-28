-- CreateEnum
CREATE TYPE "ShipmentPickingOutcome" AS ENUM ('SUCCESS', 'PARTIAL', 'ISSUE');

-- AlterEnum
ALTER TYPE "ShipmentStatus" ADD VALUE 'DISPATCHED';

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN "picking_outcome" "ShipmentPickingOutcome",
ADD COLUMN "picking_complete_comment" TEXT,
ADD COLUMN "writeoff_completed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN "shipment_id" TEXT;

-- CreateIndex
CREATE INDEX "stock_movements_shipment_id_idx" ON "stock_movements"("shipment_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
