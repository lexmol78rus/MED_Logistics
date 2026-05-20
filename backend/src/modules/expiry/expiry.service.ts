import { Injectable } from '@nestjs/common';
import { LotStatus, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { computeLotUiStatus } from '../../common/utils/inventory-status.util';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpiryQueryDto } from './dto/expiry-query.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

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

function expiryRiskLabel(days: number | null): string {
  if (days == null) return 'Внимание';
  if (days < 0) return 'Просрочено';
  if (days < 30) return 'Критичный';
  if (days < 90) return 'Внимание';
  return 'ОК';
}

@Injectable()
export class ExpiryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ExpiryQueryDto): Promise<PaginatedResponse<ExpiryListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const now = Date.now();
    const in30 = new Date(now + 30 * DAY_MS);
    const in90 = new Date(now + 90 * DAY_MS);

    const where: Prisma.LotWhereInput = {
      expiryDate: { not: null },
      inventoryRows: { some: { quantity: { gt: 0 } } },
      ...(query.manufacturer
        ? { product: { manufacturer: { contains: query.manufacturer, mode: 'insensitive' } } }
        : {}),
    };

    if (query.filter === 'expired') {
      where.expiryDate = { lt: new Date() };
    } else if (query.filter === 'lt30') {
      where.expiryDate = { gte: new Date(), lte: in30 };
    } else if (query.filter === 'lt90') {
      where.expiryDate = { gt: in30, lte: in90 };
    } else {
      where.OR = [{ expiryDate: { lt: new Date() } }, { expiryDate: { lte: in90 } }];
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
      const days = lot.expiryDate
        ? Math.ceil((lot.expiryDate.getTime() - now) / DAY_MS)
        : null;
      const uiStatus = computeLotUiStatus(lot.status, lot.expiryDate, qty);

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
        status: expiryRiskLabel(days),
        lotDbStatus: lot.status,
        uiStatus,
      };
    });

    if (query.status) {
      const s = query.status.toLowerCase();
      items = items.filter(
        (i) =>
          i.status.toLowerCase() === s ||
          i.uiStatus.toLowerCase() === s ||
          (s === 'карантин' && i.lotDbStatus === LotStatus.QUARANTINE) ||
          (s === 'блок' && i.lotDbStatus === LotStatus.BLOCKED),
      );
    }

    return {
      items: items.map(({ uiStatus: _u, lotDbStatus, ...rest }) => ({
        ...rest,
        lotDbStatus,
      })),
      total: query.status ? items.length : total,
      page,
      pageSize,
    };
  }

  async getSummary() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * DAY_MS);
    const in90 = new Date(now.getTime() + 90 * DAY_MS);
    const base = { inventoryRows: { some: { quantity: { gt: 0 } } } };

    const [expired, lt30, lt90] = await Promise.all([
      this.prisma.lot.count({
        where: { ...base, expiryDate: { lt: now } },
      }),
      this.prisma.lot.count({
        where: { ...base, expiryDate: { gte: now, lte: in30 } },
      }),
      this.prisma.lot.count({
        where: { ...base, expiryDate: { gt: in30, lte: in90 } },
      }),
    ]);

    return { expired, lt30, lt90 };
  }
}
