-- CreateTable
CREATE TABLE "product_name_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "manufacturer" TEXT,
    "use_count" INTEGER NOT NULL DEFAULT 1,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_name_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_name_catalog_name_normalized_key" ON "product_name_catalog"("name_normalized");

-- CreateIndex
CREATE INDEX "product_name_catalog_name_idx" ON "product_name_catalog"("name");

-- CreateIndex
CREATE INDEX "product_name_catalog_last_used_at_idx" ON "product_name_catalog"("last_used_at");

-- Backfill from existing products (distinct by normalized name, keep latest manufacturer)
INSERT INTO "product_name_catalog" (
    "id",
    "name",
    "name_normalized",
    "manufacturer",
    "use_count",
    "last_used_at",
    "created_at",
    "updated_at"
)
SELECT
    md5('pnc:' || agg.name_normalized),
    agg.display_name,
    agg.name_normalized,
    agg.manufacturer,
    agg.cnt,
    NOW(),
    NOW(),
    NOW()
FROM (
    SELECT
        lower(trim(regexp_replace(p.name, '\s+', ' ', 'g'))) AS name_normalized,
        (array_agg(trim(p.name) ORDER BY p.updated_at DESC))[1] AS display_name,
        (array_agg(nullif(trim(p.manufacturer), '') ORDER BY p.updated_at DESC))[1] AS manufacturer,
        count(*)::int AS cnt
    FROM products p
    WHERE trim(p.name) <> ''
    GROUP BY lower(trim(regexp_replace(p.name, '\s+', ' ', 'g')))
) agg
ON CONFLICT ("name_normalized") DO NOTHING;
