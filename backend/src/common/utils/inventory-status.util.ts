import { LotStatus } from '@prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;

export type ProductStatusLabel = 'АКТИВЕН' | 'ВНИМАНИЕ' | 'КРИТИЧНО' | 'ОТСУТСТВУЕТ';

export function computeProductStatus(
  totalQty: number,
  nearestExpiry: Date | null,
): ProductStatusLabel {
  if (totalQty <= 0) return 'ОТСУТСТВУЕТ';
  if (!nearestExpiry) return 'АКТИВЕН';

  const daysUntilExpiry = (nearestExpiry.getTime() - Date.now()) / DAY_MS;
  if (daysUntilExpiry < 30) return 'КРИТИЧНО';
  if (daysUntilExpiry < 90) return 'ВНИМАНИЕ';
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
