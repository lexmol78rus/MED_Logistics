-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN "corrected_movement_id" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "correction_session_id" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "edit_reason" TEXT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_corrected_movement_id_fkey" FOREIGN KEY ("corrected_movement_id") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "stock_movements_corrected_movement_id_idx" ON "stock_movements"("corrected_movement_id");
CREATE INDEX "stock_movements_correction_session_id_idx" ON "stock_movements"("correction_session_id");
