import { getExpiryThresholds } from '../expiry/thresholds';

export type MovementExpiryTone = 'empty' | 'ok' | 'warning' | 'critical';

const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveMovementExpiryTone(
  expiryDate: string | null | undefined,
): MovementExpiryTone {
  if (!expiryDate?.trim()) return 'empty';
  const diff = new Date(expiryDate.trim()).getTime() - Date.now();
  if (Number.isNaN(diff)) return 'empty';
  const { criticalDays, warningDays } = getExpiryThresholds();
  if (diff < criticalDays * DAY_MS) return 'critical';
  if (diff < warningDays * DAY_MS) return 'warning';
  return 'ok';
}

export function formatMovementExpiry(expiryDate: string | null | undefined): string {
  if (!expiryDate?.trim()) return '—';
  return expiryDate.trim();
}
