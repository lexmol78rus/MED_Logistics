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
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function lotIsExpired(lot: { expiry: string; expired?: boolean }): boolean {
  return lot.expired ?? isWriteoffLotExpired(lot.expiry);
}
