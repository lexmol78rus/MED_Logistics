import { LotStatus } from '@prisma/client';
import { computeInventoryBalance } from './inventory-balance.util';

const DAY_MS = 24 * 60 * 60 * 1000;

export type ProductStatusLabel = 'АКТИВЕН' | 'БЛОК' | 'КРИТИЧНО';

export type ProductLotContext = {
  lotNumber: string;
  expiryDate: Date | null;
  status: LotStatus;
  totalQty: number;
  reservedQty: number;
};

function compareFefo(a: ProductLotContext, b: ProductLotContext): number {
  const ta = a.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const tb = b.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta - tb;
  return a.lotNumber.localeCompare(b.lotNumber, 'ru');
}

function lotAvailableQty(lot: ProductLotContext): number {
  if (lot.totalQty <= 0) return 0;
  return computeInventoryBalance(lot.totalQty, {
    status: lot.status,
    expiryDate: lot.expiryDate,
    reservedQuantity: lot.reservedQty,
  }).availableQuantity;
}

export function sortLotsFefo(lots: ProductLotContext[]): ProductLotContext[] {
  return [...lots].sort(compareFefo);
}

/** Первая доступная партия по FEFO (срок ↑, затем номер LOT). */
export function resolvePrimaryLotNumber(lots: ProductLotContext[]): string | null {
  for (const lot of sortLotsFefo(lots)) {
    if (lotAvailableQty(lot) > 0) return lot.lotNumber;
  }
  return null;
}

/** Ближайший срок среди партий с доступным остатком. */
export function resolveNearestAvailableExpiry(lots: ProductLotContext[]): Date | null {
  for (const lot of sortLotsFefo(lots)) {
    if (lotAvailableQty(lot) > 0 && lot.expiryDate) return lot.expiryDate;
  }
  return null;
}

export function computeProductStatus(
  availableQty: number,
  nearestExpiry: Date | null,
): ProductStatusLabel {
  if (availableQty <= 0) return 'БЛОК';
  if (!nearestExpiry) return 'АКТИВЕН';

  const daysUntilExpiry = (nearestExpiry.getTime() - Date.now()) / DAY_MS;
  if (daysUntilExpiry < 30) return 'КРИТИЧНО';
  return 'АКТИВЕН';
}

export function computeLotUiStatus(
  status: LotStatus,
  expiryDate: Date | null,
  qty: number,
): 'ОК' | 'ВНИМАНИЕ' | 'КАРАНТИН' | 'БЛОК' {
  if (status === LotStatus.QUARANTINE) return 'КАРАНТИН';
  if (status === LotStatus.BLOCKED) return 'БЛОК';
  if (qty <= 0) return 'ОК';
  if (expiryDate) {
    const daysUntilExpiry = (expiryDate.getTime() - Date.now()) / DAY_MS;
    if (daysUntilExpiry < 30) return 'ВНИМАНИЕ';
  }
  if (status === LotStatus.WARNING) return 'ВНИМАНИЕ';
  return 'ОК';
}

export function formatNearestExpiry(date: Date | null): string {
  if (!date) return 'Н/Д';
  return date.toISOString().slice(0, 10);
}
