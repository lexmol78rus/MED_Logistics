import { Injectable } from '@nestjs/common';
import { LotStatus, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { buildCriticalRiskLotWhere, EXPIRY_DAY_MS } from '../../common/utils/expiry-critical.util';
import {
  daysUntilExpiryCeil,
  expiryRiskLabel,
  expiryThresholdDates,
  resolveExpiryThresholds,
  type ExpiryThresholds,
} from '../../common/utils/expiry-thresholds.util';
import { computeLotUiStatus } from '../../common/utils/inventory-status.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ExpiryQueryDto } from './dto/expiry-query.dto';

const DAY_MS = EXPIRY_DAY_MS;

export type ExpiryListItem = {
  id: string;
  productId: string;
  lot: string;
  ref: string;
  name: string;
  manufacturer: string | null;
  expiry: string | null;
  days: number | null;
  qty: number;
  status: string;
  lotDbStatus: LotStatus;
};

@Injectable()
export class ExpiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private async getExpiryThresholds(): Promise<ExpiryThresholds> {
    const cfg = await this.settings.get();
    return resolveExpiryThresholds({
      warningDays: cfg.expiryWarningDays,
      criticalDays: cfg.expiryCriticalDays,
    });
  }

  async list(query: ExpiryQueryDto): Promise<PaginatedResponse<ExpiryListItem>> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 100, 100);
    const thresholds = await this.getExpiryThresholds();
    const nowMs = Date.now();
    const { now, inCritical, inWarning } = expiryThresholdDates(new Date(nowMs), thresholds);

    const where: Prisma.LotWhereInput =
      query.filter === 'critical'
        ? buildCriticalRiskLotWhere(now, thresholds)
        : {
            expiryDate: { not: null },
            inventoryRows: { some: { quantity: { gt: 0 } } },
          };

    if (query.manufacturer) {
      where.product = {
        manufacturer: { contains: query.manufacturer, mode: 'insensitive' },
      };
    }

    if (query.filter === 'expired') {
      where.expiryDate = { lt: now };
    } else if (query.filter === 'lt30') {
      where.expiryDate = { gte: now, lte: inCritical };
    } else if (query.filter === 'lt90') {
      where.expiryDate = { gt: inCritical, lte: inWarning };
    } else if (query.filter !== 'critical') {
      // All risks: expiry buckets + isolated lots (quarantine / block)
      where.OR = [
        { expiryDate: { lt: now } },
        { expiryDate: { lte: inWarning } },
        { status: { in: [LotStatus.QUARANTINE, LotStatus.BLOCKED] } },
      ];
    }

    if (query.status) {
      const s = query.status.toLowerCase();
      const statusWhere: Prisma.LotWhereInput[] = [];
      if (s === 'карантин' || s === 'quarantine') {
        statusWhere.push({ status: LotStatus.QUARANTINE });
      } else if (s === 'блок' || s === 'blocked') {
        statusWhere.push({ status: LotStatus.BLOCKED });
      } else if (s === 'просрочено' || s === 'expired') {
        statusWhere.push({ expiryDate: { lt: now } });
      } else if (s === 'критичный' || s === 'critical') {
        statusWhere.push({ expiryDate: { gte: now, lte: inCritical } });
      } else if (s === 'внимание' || s === 'warning') {
        statusWhere.push({
          OR: [
            { expiryDate: { gt: inCritical, lte: inWarning } },
            { status: LotStatus.WARNING },
          ],
        });
      }
      if (statusWhere.length === 1) {
        where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), statusWhere[0]];
      }
    }

    const [total, lots] = await Promise.all([
      this.prisma.lot.count({ where }),
      this.prisma.lot.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ expiryDate: 'asc' }, { lotNumber: 'asc' }],
        include: {
          product: { select: { id: true, sku: true, name: true, manufacturer: true } },
          inventoryRows: { select: { quantity: true } },
        },
      }),
    ]);

    let items = lots.map((lot) => {
      const qty = lot.inventoryRows.reduce(
        (sum, row) => sum + decimalToNumber(row.quantity),
        0,
      );
      const days = lot.expiryDate ? daysUntilExpiryCeil(lot.expiryDate, nowMs) : null;
      const uiStatus = computeLotUiStatus(lot.status, lot.expiryDate, qty, thresholds);

      return {
        id: lot.id,
        productId: lot.productId,
        lot: lot.lotNumber,
        ref: lot.product.sku,
        name: lot.product.name,
        manufacturer: lot.product.manufacturer,
        expiry: lot.expiryDate?.toISOString().slice(0, 10) ?? null,
        days,
        qty,
        status: expiryRiskLabel(days, thresholds),
        lotDbStatus: lot.status,
        uiStatus,
      };
    });

    return {
      items: items.map(({ uiStatus: _u, lotDbStatus, ...rest }) => ({
        ...rest,
        lotDbStatus,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getSummary() {
    const thresholds = await this.getExpiryThresholds();
    const now = new Date();
    const { inCritical, inWarning } = expiryThresholdDates(now, thresholds);
    const base = { inventoryRows: { some: { quantity: { gt: 0 } } } };

    const riskWhere: Prisma.LotWhereInput = {
      ...base,
      expiryDate: { not: null },
      OR: [
        { expiryDate: { lt: now } },
        { expiryDate: { lte: inWarning } },
        { status: { in: [LotStatus.QUARANTINE, LotStatus.BLOCKED] } },
      ],
    };

    const [expired, lt30, lt90, restricted, total] = await Promise.all([
      this.prisma.lot.count({
        where: { ...base, expiryDate: { lt: now } },
      }),
      this.prisma.lot.count({
        where: { ...base, expiryDate: { gte: now, lte: inCritical } },
      }),
      this.prisma.lot.count({
        where: { ...base, expiryDate: { gt: inCritical, lte: inWarning } },
      }),
      this.prisma.lot.count({
        where: {
          ...base,
          status: { in: [LotStatus.QUARANTINE, LotStatus.BLOCKED] },
        },
      }),
      this.prisma.lot.count({ where: riskWhere }),
    ]);

    const critical = await this.countCriticalRisks(now, thresholds);

    return {
      expired,
      lt30,
      lt90,
      restricted,
      total,
      critical,
      expiryCriticalDays: thresholds.criticalDays,
      expiryWarningDays: thresholds.warningDays,
    };
  }

  /** Same predicate as Dashboard KPI and widget (`filter=critical`). */
  countCriticalRisks(
    now = new Date(),
    thresholds?: ExpiryThresholds,
  ): Promise<number> {
    const t = thresholds ?? resolveExpiryThresholds();
    return this.prisma.lot.count({ where: buildCriticalRiskLotWhere(now, t) });
  }
}
