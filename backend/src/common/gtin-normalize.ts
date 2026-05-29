/** Нормализация GTIN: только цифры, 8–14 знаков → 14 с ведущими нулями. */
export function normalizeGtin(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits.padStart(14, '0');
}
