-- AlterTable
ALTER TABLE "shipment_items" ADD COLUMN "product_id" TEXT;

-- CreateIndex
CREATE INDEX "shipment_items_product_id_idx" ON "shipment_items"("product_id");

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: REF (code) -> Product.sku
UPDATE "shipment_items" AS si
SET "product_id" = p."id"
FROM "products" AS p
WHERE si."code" IS NOT NULL
  AND TRIM(si."code") <> ''
  AND UPPER(TRIM(si."code")) = UPPER(TRIM(p."sku"));
