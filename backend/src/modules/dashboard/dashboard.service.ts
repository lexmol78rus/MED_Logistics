import { Injectable } from '@nestjs/common';
import { LotStatus, MovementType } from '@prisma/client';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { expiryThresholdDates, resolveExpiryThresholds } from '../../common/utils/expiry-thresholds.util';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpiryService } from '../expiry/expiry.service';
import { InventoryBalanceService } from '../inventory/inventory-balance.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: InventoryBalanceService,
    private readonly expiry: ExpiryService,
    private readonly settings: SettingsService,
  ) {}

  async getSummary() {
    const now = new Date();
    const cfg = await this.settings.get();
    const thresholds = resolveExpiryThresholds({
      warningDays: cfg.expiryWarningDays,
      criticalDays: cfg.expiryCriticalDays,
    });
    const { inCritical, inWarning } = expiryThresholdDates(now, thresholds);

    const [
      inventoryRows,
      activeLots,
      criticalExpiryCount,
      expiringSoon,
      expiring90,
      quarantineLots,
      blockedLots,
      recentMovements,
      writeoffAgg,
      productCount,
    ] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        select: { quantity: true },
      }),
      this.prisma.lot.count(),
      this.expiry.countCriticalRisks(now, thresholds),
      this.prisma.lot.count({
        where: {
          expiryDate: { lte: inCritical, gt: now },
          inventoryRows: { some: { quantity: { gt: 0 } } },
        },
      }),
      this.prisma.lot.count({
        where: {
          expiryDate: { lte: inWarning, gt: inCritical },
          inventoryRows: { some: { quantity: { gt: 0 } } },
        },
      }),
      this.prisma.lot.count({ where: { status: LotStatus.QUARANTINE } }),
      this.prisma.lot.count({ where: { status: LotStatus.BLOCKED } }),
      this.prisma.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          lot: { select: { lotNumber: true } },
        },
      }),
      this.prisma.stockMovement.aggregate({
        where: { type: MovementType.ISSUE },
        _count: { id: true },
        _sum: { quantity: true },
      }),
      this.prisma.product.count(),
    ]);

    const totalQty = inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.quantity),
      0,
    );

    const productsWithThreshold = await this.prisma.product.findMany({
      where: { OR: [{ minStock: { not: null } }, { reorderPoint: { not: null } }] },
      select: { id: true, minStock: true, reorderPoint: true },
    });

    let lowStockCount = 0;
    for (const p of productsWithThreshold) {
      const bal = await this.balance.getProductBalance(p.id);
      const threshold = p.reorderPoint ?? p.minStock;
      if (threshold == null) continue;
      const limit = decimalToNumber(threshold);
      if (bal.availableQuantity > 0 && bal.availableQuantity <= limit) {
        lowStockCount += 1;
      }
    }

    const TYPE_LABELS: Record<MovementType, string> = {
      RECEIPT: 'ПРИХОД',
      ISSUE: 'РАСХОД',
      ADJUSTMENT: 'КОРРЕКТИРОВКА',
      QUARANTINE: 'КАРАНТИН',
      UNBLOCK: 'РАЗБЛОКИРОВКА',
      RECALL: 'ОТЗЫВ',
      BLOCK: 'БЛОКИРОВКА',
    };

    return {
      productsCount: productCount,
      activeLotsCount: activeLots,
      criticalExpiryCount,
      lowStockCount,
      inventoryTotalUnits: totalQty,
      positionsOnStock: productCount,
      activeLots,
      expiringSoon,
      expiringWithin90: expiring90,
      quarantineLots,
      blockedLots,
      activeRecalls: quarantineLots + blockedLots,
      writeoffStats: {
        totalOperations: writeoffAgg._count.id,
        totalQuantity: decimalToNumber(writeoffAgg._sum.quantity ?? 0),
      },
      recentMovements: recentMovements.map((m) => {
        const qtyNum = decimalToNumber(m.quantity);
        const sign =
          m.type === MovementType.RECEIPT || m.type === MovementType.UNBLOCK
            ? '+'
            : m.type === MovementType.ISSUE
              ? '-'
              : '';
        return {
          id: m.reference,
          type: TYPE_LABELS[m.type],
          ref: m.product.sku,
          desc: m.product.name,
          qty: qtyNum === 0 ? '0' : `${sign}${Math.abs(qtyNum).toLocaleString('ru-RU')}`,
          lot: m.lot?.lotNumber ?? null,
          createdAt: m.createdAt.toISOString(),
        };
      }),
    };
  }
}
