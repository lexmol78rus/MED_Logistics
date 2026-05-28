-- CreateEnum
CREATE TYPE "CounterpartyType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "ContractDocType" AS ENUM ('DOCX', 'HTML', 'PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('NEW', 'PICKING', 'PICKED');

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "channel" SET DEFAULT 'in_app';

-- CreateTable
CREATE TABLE "counterparties" (
    "id" TEXT NOT NULL,
    "type" "CounterpartyType" NOT NULL,
    "name" TEXT NOT NULL,
    "inn" TEXT,
    "kpp" TEXT,
    "comment" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "counterparty_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "title" TEXT,
    "doc_type" "ContractDocType" NOT NULL DEFAULT 'OTHER',
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'NEW',
    "counterparty_id" TEXT,
    "contract_id" TEXT,
    "note" TEXT,
    "created_by" TEXT,
    "picking_sent_at" TIMESTAMP(3),
    "picked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "unit" TEXT,
    "vat_rate" TEXT,
    "price_with_vat" DECIMAL(18,4),
    "quantity" DECIMAL(18,4) NOT NULL,
    "sum" DECIMAL(18,4),
    "contract_line_no" INTEGER,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "counterparties_type_is_active_idx" ON "counterparties"("type", "is_active");

-- CreateIndex
CREATE INDEX "counterparties_name_idx" ON "counterparties"("name");

-- CreateIndex
CREATE INDEX "contracts_number_idx" ON "contracts"("number");

-- CreateIndex
CREATE INDEX "contracts_counterparty_id_created_at_idx" ON "contracts"("counterparty_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_counterparty_id_number_key" ON "contracts"("counterparty_id", "number");

-- CreateIndex
CREATE INDEX "shipments_status_created_at_idx" ON "shipments"("status", "created_at");

-- CreateIndex
CREATE INDEX "shipments_counterparty_id_idx" ON "shipments"("counterparty_id");

-- CreateIndex
CREATE INDEX "shipments_contract_id_idx" ON "shipments"("contract_id");

-- CreateIndex
CREATE INDEX "shipment_items_shipment_id_idx" ON "shipment_items"("shipment_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

