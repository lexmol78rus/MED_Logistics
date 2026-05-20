-- Product low-stock thresholds
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "min_stock" DECIMAL(18,4);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reorder_point" DECIMAL(18,4);

-- Reserved quantity on inventory rows
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "reserved_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- System settings (single-row JSON config)
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "payload" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Notification persistence fields
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "href" TEXT;
ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "payload" DROP NOT NULL;

UPDATE "notifications" SET
  "type" = COALESCE("type", 'legacy'),
  "title" = COALESCE("title", 'Уведомление'),
  "message" = COALESCE("message", COALESCE("payload"::text, ''))
WHERE "type" IS NULL;

ALTER TABLE "notifications" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "message" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "notifications_type_created_at_idx" ON "notifications"("type", "created_at");
