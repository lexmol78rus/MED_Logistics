import { LotStatus, Prisma } from '@prisma/client';
import {
  expiryThresholdDates,
  resolveExpiryThresholds,
  type ExpiryThresholds,
} from './expiry-thresholds.util';

export const EXPIRY_DAY_MS = 24 * 60 * 60 * 1000;

/** Thresholds for dashboard / expiry "critical" bucket (expired + critical window + blocked). */
export function criticalRiskThresholds(
  now = new Date(),
  thresholds: ExpiryThresholds = resolveExpiryThresholds(),
) {
  const { now: n, inCritical } = expiryThresholdDates(now, thresholds);
  return { now: n, inCritical };
}

/**
 * Lots that must appear in Dashboard "Критические сроки" and match the highest-risk
 * rows on Контроль сроков: Просрочено, Критичный, Блок.
 */
export function buildCriticalRiskLotWhere(
  now = new Date(),
  thresholds: ExpiryThresholds = resolveExpiryThresholds(),
): Prisma.LotWhereInput {
  const { now: n, inCritical } = criticalRiskThresholds(now, thresholds);
  return {
    expiryDate: { not: null },
    inventoryRows: { some: { quantity: { gt: 0 } } },
    OR: [
      { expiryDate: { lt: n } },
      { expiryDate: { gte: n, lte: inCritical } },
      { status: LotStatus.BLOCKED },
    ],
  };
}
