import type { Prisma } from '@prisma/client';

/** Нормализация REF / артикула (как в quick-create товара). */
export function normalizeProductRef(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

type ProductRefRow = { id: string; sku: string };

/**
 * Пакетный поиск товаров по REF (sku), без учёта регистра.
 * Ключ карты — normalizeProductRef(входной ref).
 */
export async function findProductIdsByRefs(
  prisma: { product: { findMany: (args: Prisma.ProductFindManyArgs) => Promise<ProductRefRow[]> } },
  refs: Iterable<string | null | undefined>,
): Promise<Map<string, string>> {
  const normalized = [
    ...new Set(
      [...refs]
        .map((r) => normalizeProductRef(r))
        .filter((r): r is string => !!r),
    ),
  ];
  if (!normalized.length) return new Map();

  const products = await prisma.product.findMany({
    where: {
      OR: normalized.map((ref) => ({ sku: { equals: ref, mode: 'insensitive' as const } })),
    },
    select: { id: true, sku: true },
  });

  const map = new Map<string, string>();
  for (const p of products) {
    const key = normalizeProductRef(p.sku);
    if (key && !map.has(key)) map.set(key, p.id);
  }
  return map;
}

export type ShipmentRefLinkStatus = 'LINKED' | 'NOT_FOUND' | 'NO_REF';

export function resolveShipmentRefLinkStatus(
  code: string | null | undefined,
  productId: string | null | undefined,
): ShipmentRefLinkStatus {
  if (!normalizeProductRef(code)) return 'NO_REF';
  return productId ? 'LINKED' : 'NOT_FOUND';
}
