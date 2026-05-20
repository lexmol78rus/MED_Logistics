import { LotStatus } from '@prisma/client';

export type InventoryBalanceBreakdown = {
  totalQuantity: number;
  availableQuantity: number;
  blockedQuantity: number;
  quarantinedQuantity: number;
  expiredQuantity: number;
  reservedQuantity: number;
};

export type BalanceLotContext = {
  status: LotStatus;
  expiryDate: Date | null;
  reservedQuantity?: number;
};

/**
 * Canonical inventory balance: available = total - blocked - quarantined - expired - reserved
 */
export function computeInventoryBalance(
  totalQuantity: number,
  lot: BalanceLotContext,
  now: Date = new Date(),
): InventoryBalanceBreakdown {
  const reservedQuantity = Math.max(0, lot.reservedQuantity ?? 0);
  const isExpired = lot.expiryDate != null && lot.expiryDate.getTime() < now.getTime();
  const isBlocked = lot.status === LotStatus.BLOCKED;
  const isQuarantine = lot.status === LotStatus.QUARANTINE;

  const blockedQuantity = isBlocked ? totalQuantity : 0;
  const quarantinedQuantity = isQuarantine ? totalQuantity : 0;
  const expiredQuantity =
    isExpired && !isBlocked && !isQuarantine ? totalQuantity : 0;

  const restricted =
    blockedQuantity + quarantinedQuantity + expiredQuantity + reservedQuantity;
  const availableQuantity = Math.max(0, totalQuantity - restricted);

  return {
    totalQuantity,
    availableQuantity,
    blockedQuantity,
    quarantinedQuantity,
    expiredQuantity,
    reservedQuantity,
  };
}

export function mergeBalances(
  balances: InventoryBalanceBreakdown[],
): InventoryBalanceBreakdown {
  return balances.reduce(
    (acc, b) => ({
      totalQuantity: acc.totalQuantity + b.totalQuantity,
      availableQuantity: acc.availableQuantity + b.availableQuantity,
      blockedQuantity: acc.blockedQuantity + b.blockedQuantity,
      quarantinedQuantity: acc.quarantinedQuantity + b.quarantinedQuantity,
      expiredQuantity: acc.expiredQuantity + b.expiredQuantity,
      reservedQuantity: acc.reservedQuantity + b.reservedQuantity,
    }),
    {
      totalQuantity: 0,
      availableQuantity: 0,
      blockedQuantity: 0,
      quarantinedQuantity: 0,
      expiredQuantity: 0,
      reservedQuantity: 0,
    },
  );
}
