-- Add full legal name for counterparties.
-- We keep "name" as short display name to avoid breaking UI/dependencies.

ALTER TABLE "counterparties"
ADD COLUMN IF NOT EXISTS "full_name" TEXT;

-- Backfill for existing records (best-effort).
UPDATE "counterparties"
SET "full_name" = "name"
WHERE "full_name" IS NULL;

