-- GTIN товара (из GS1 / этикетки) для учёта и будущей интеграции с Честным ЗНАКом.
ALTER TABLE "products" ADD COLUMN "gtin" VARCHAR(14);

CREATE UNIQUE INDEX "products_gtin_key" ON "products"("gtin");
