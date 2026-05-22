-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN "operation_group_id" TEXT;

-- CreateIndex
CREATE INDEX "stock_movements_operation_group_id_idx" ON "stock_movements"("operation_group_id");
