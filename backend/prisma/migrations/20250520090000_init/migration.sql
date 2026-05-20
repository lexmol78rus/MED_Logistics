-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "lot_number" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_records" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "product_id" TEXT,
    "lot_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barcode_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "lots_product_id_expiry_date_idx" ON "lots"("product_id", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "lots_product_id_lot_number_key" ON "lots"("product_id", "lot_number");

-- CreateIndex
CREATE INDEX "inventory_items_product_id_lot_id_idx" ON "inventory_items"("product_id", "lot_id");

-- CreateIndex
CREATE UNIQUE INDEX "barcode_records_barcode_key" ON "barcode_records"("barcode");

-- CreateIndex
CREATE INDEX "barcode_records_product_id_idx" ON "barcode_records"("product_id");

-- CreateIndex
CREATE INDEX "barcode_records_lot_id_idx" ON "barcode_records"("lot_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_records" ADD CONSTRAINT "barcode_records_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_records" ADD CONSTRAINT "barcode_records_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
