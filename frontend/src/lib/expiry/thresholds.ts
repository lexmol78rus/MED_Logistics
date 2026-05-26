import { loadSettings, type WarehouseSettings } from '../settings/storage';

const DAY_MS = 24 * 60 * 60 * 1000;

export type ExpiryThresholds = {
  warningDays: number;
  criticalDays: number;
};

export function getExpiryThresholds(
  settings?: Pick<WarehouseSettings, 'expiryWarningDays' | 'expiryCriticalDays'>,
): ExpiryThresholds {
  const s = settings ?? loadSettings();
  const warningDays = Math.max(1, Math.floor(s.expiryWarningDays));
  const criticalRaw = Math.floor(s.expiryCriticalDays);
  const criticalDays = Math.max(1, Math.min(criticalRaw, warningDays - 1));
  return { warningDays, criticalDays };
}

export function expiryDiffMs(expiryDate: string): number {
  return new Date(expiryDate.trim()).getTime() - Date.now();
}

export function isExpiryCritical(expiryDate: string, thresholds = getExpiryThresholds()): boolean {
  const diff = expiryDiffMs(expiryDate);
  return !Number.isNaN(diff) && diff < thresholds.criticalDays * DAY_MS;
}

export function isExpiryWarning(expiryDate: string, thresholds = getExpiryThresholds()): boolean {
  const diff = expiryDiffMs(expiryDate);
  return !Number.isNaN(diff) && diff < thresholds.warningDays * DAY_MS;
}
