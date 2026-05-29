-- CreateTable
CREATE TABLE "shipment_assembly_reservations" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "reserved_by_email" TEXT NOT NULL,
    "reserved_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_assembly_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipment_assembly_reservations_product_id_idx" ON "shipment_assembly_reservations"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_assembly_reservations_shipment_id_product_id_key" ON "shipment_assembly_reservations"("shipment_id", "product_id");

-- AddForeignKey
ALTER TABLE "shipment_assembly_reservations" ADD CONSTRAINT "shipment_assembly_reservations_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_assembly_reservations" ADD CONSTRAINT "shipment_assembly_reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
