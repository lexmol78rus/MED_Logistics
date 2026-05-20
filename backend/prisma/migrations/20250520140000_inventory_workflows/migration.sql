-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('OK', 'WARNING', 'QUARANTINE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RECEIPT', 'ISSUE', 'ADJUSTMENT', 'QUARANTINE', 'UNBLOCK');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "manufacturer" TEXT;

-- AlterTable
ALTER TABLE "lots" ADD COLUMN "mfg_date" TIMESTAMP(3),
ADD COLUMN "status" "LotStatus" NOT NULL DEFAULT 'OK';

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "lot_id" TEXT,
    "type" "MovementType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "actor_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_reference_key" ON "stock_movements"("reference");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements"("created_at");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
