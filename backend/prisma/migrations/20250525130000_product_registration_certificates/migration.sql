-- CreateTable
CREATE TABLE "product_registration_certificates" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_registration_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_registration_certificates_product_id_created_at_idx" ON "product_registration_certificates"("product_id", "created_at");

-- AddForeignKey
ALTER TABLE "product_registration_certificates" ADD CONSTRAINT "product_registration_certificates_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
