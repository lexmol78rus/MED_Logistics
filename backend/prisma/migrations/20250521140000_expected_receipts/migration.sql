-- CreateEnum
CREATE TYPE "ExpectedReceiptStatus" AS ENUM ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpectedReceiptEventType" AS ENUM ('CREATED', 'RECEIVED', 'UPDATED', 'CANCELLED', 'CLOSED');

-- CreateTable
CREATE TABLE "expected_receipts" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "ordered_qty" DECIMAL(18,4) NOT NULL,
    "received_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "ExpectedReceiptStatus" NOT NULL DEFAULT 'ORDERED',
    "comment" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expected_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expected_receipt_events" (
    "id" TEXT NOT NULL,
    "expected_receipt_id" TEXT NOT NULL,
    "type" "ExpectedReceiptEventType" NOT NULL,
    "quantity" DECIMAL(18,4),
    "message" TEXT,
    "actor_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expected_receipt_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expected_receipts_product_id_status_idx" ON "expected_receipts"("product_id", "status");

-- CreateIndex
CREATE INDEX "expected_receipts_status_idx" ON "expected_receipts"("status");

-- CreateIndex
CREATE INDEX "expected_receipt_events_expected_receipt_id_created_at_idx" ON "expected_receipt_events"("expected_receipt_id", "created_at");

-- AddForeignKey
ALTER TABLE "expected_receipts" ADD CONSTRAINT "expected_receipts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expected_receipt_events" ADD CONSTRAINT "expected_receipt_events_expected_receipt_id_fkey" FOREIGN KEY ("expected_receipt_id") REFERENCES "expected_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
