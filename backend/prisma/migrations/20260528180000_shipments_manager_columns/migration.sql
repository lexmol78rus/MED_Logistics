-- Add manager-specific columns to shipment items
ALTER TABLE "shipment_items"
ADD COLUMN "manager_note" TEXT,
ADD COLUMN "manager_tag" TEXT;

