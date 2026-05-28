-- Add cached "Объект закупки" extraction for contracts
ALTER TABLE "contracts"
  ADD COLUMN "procurement_items" JSONB,
  ADD COLUMN "procurement_parsed_at" TIMESTAMPTZ,
  ADD COLUMN "procurement_parse_error" TEXT;

