import type { ScanParsedFields } from '../../types/api';

export function isoToRuDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function isExpiryIsoInPast(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const expiry = new Date(Date.UTC(y, mo - 1, d));
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return expiry.getTime() < today.getTime();
}

export function expiryBlockMessage(iso: string): string {
  return `Приёмка заблокирована: срок годности ${isoToRuDate(iso)} уже истёк. Товар принять на склад нельзя.`;
}

export function applyScanParsedFields(
  parsed: ScanParsedFields,
  apply: (fields: { lot?: string; expiry?: string }) => void,
  setExpiryText: (text: string) => void,
): void {
  const patch: { lot?: string; expiry?: string } = {};
  if (parsed.lot?.trim()) {
    patch.lot = parsed.lot.trim().toUpperCase();
  }
  if (parsed.expiryDate) {
    patch.expiry = parsed.expiryDate;
    setExpiryText(isoToRuDate(parsed.expiryDate));
  }
  if (patch.lot || patch.expiry) {
    apply(patch);
  }
}
