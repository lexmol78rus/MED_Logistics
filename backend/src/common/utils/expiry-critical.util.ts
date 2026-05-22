import { LotStatus, Prisma } from '@prisma/client';

export const EXPIRY_DAY_MS = 24 * 60 * 60 * 1000;

/** Thresholds for dashboard / expiry "critical" bucket (expired + lt30 + blocked). */
export function criticalRiskThresholds(now = new Date()) {
  const in30 = new Date(now.getTime() + 30 * EXPIRY_DAY_MS);
  return { now, in30 };
}

/**
 * Lots that must appear in Dashboard "Критические сроки" and match the highest-risk
 * rows on Контроль сроков: Просрочено, Критичный (<30d), Блок.
 */
export function buildCriticalRiskLotWhere(now = new Date()): Prisma.LotWhereInput {
  const { now: n, in30 } = criticalRiskThresholds(now);
  return {
    expiryDate: { not: null },
    inventoryRows: { some: { quantity: { gt: 0 } } },
    OR: [
      { expiryDate: { lt: n } },
      { expiryDate: { gte: n, lte: in30 } },
      { status: LotStatus.BLOCKED },
    ],
  };
}
