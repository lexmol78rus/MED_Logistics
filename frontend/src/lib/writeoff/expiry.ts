import { formatAppDate } from '../datetime';

/** Партия просрочена (дата срока годности в прошлом). */
export function isWriteoffLotExpired(expiry: string | null | undefined): boolean {
  if (!expiry?.trim() || expiry.trim() === 'Н/Д') return false;
  const end = new Date(expiry.trim());
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

export function formatExpiryRu(expiry: string): string {
  const d = new Date(expiry.trim());
  if (Number.isNaN(d.getTime())) return expiry;
  return formatAppDate(d);
}

export function lotIsExpired(lot: { expiry: string; expired?: boolean }): boolean {
  return lot.expired ?? isWriteoffLotExpired(lot.expiry);
}
