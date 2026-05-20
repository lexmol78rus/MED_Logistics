-- Drop global unique on email (blocks reuse after soft delete).
DROP INDEX IF EXISTS "users_email_key";

-- Active users only: one row per email while deleted_at IS NULL.
CREATE UNIQUE INDEX "users_email_unique_active" ON "users"("email") WHERE "deleted_at" IS NULL;
