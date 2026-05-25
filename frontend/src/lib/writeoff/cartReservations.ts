import type { WriteoffCartItem } from '../../types/writeoff-cart';

/** Количество по lotId, уже добавленное в корзину списания (без позиции в редактировании). */
export function cartLotReservations(
  cart: WriteoffCartItem[],
  productId: string,
  excludeCartItemId: string | null = null,
): Record<string, number> {
  const reserved: Record<string, number> = {};
  for (const item of cart) {
    if (item.productId !== productId) continue;
    if (excludeCartItemId && item.id === excludeCartItemId) continue;
    for (const line of item.lines) {
      reserved[line.lotId] = (reserved[line.lotId] ?? 0) + line.quantity;
    }
  }
  return reserved;
}

export function availableAfterCart(lotQty: number, reservedQty = 0): number {
  return Math.max(0, lotQty - reservedQty);
}
