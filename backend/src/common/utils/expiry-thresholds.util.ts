import { DEFAULT_SYSTEM_SETTINGS } from '../../modules/settings/settings.types';

const EXPIRY_DAY_MS = 24 * 60 * 60 * 1000;

export type ExpiryThresholds = {
  warningDays: number;
  criticalDays: number;
};

export function resolveExpiryThresholds(
  partial?: Partial<ExpiryThresholds>,
): ExpiryThresholds {
  const warningDays = Math.max(
    1,
    Math.floor(partial?.warningDays ?? DEFAULT_SYSTEM_SETTINGS.expiryWarningDays),
  );
  const criticalRaw = Math.floor(
    partial?.criticalDays ?? DEFAULT_SYSTEM_SETTINGS.expiryCriticalDays,
  );
  const criticalDays = Math.max(1, Math.min(criticalRaw, warningDays - 1));
  return { warningDays, criticalDays };
}

export function expiryThresholdDates(now: Date, thresholds: ExpiryThresholds) {
  const t = now.getTime();
  return {
    now,
    inCritical: new Date(t + thresholds.criticalDays * EXPIRY_DAY_MS),
    inWarning: new Date(t + thresholds.warningDays * EXPIRY_DAY_MS),
  };
}

export function daysUntilExpiryCeil(expiryDate: Date, now = Date.now()): number {
  return Math.ceil((expiryDate.getTime() - now) / EXPIRY_DAY_MS);
}

export function expiryRiskLabel(
  days: number | null,
  thresholds: ExpiryThresholds = resolveExpiryThresholds(),
): string {
  if (days == null) return 'Внимание';
  if (days < 0) return 'Просрочено';
  if (days < thresholds.criticalDays) return 'Критичный';
  if (days < thresholds.warningDays) return 'Внимание';
  return 'ОК';
}
