-- Per-user permission overrides (sparse JSON: only deviations from role defaults)
ALTER TABLE "users" ADD COLUMN "permissions" JSONB;
