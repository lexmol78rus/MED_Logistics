import { Injectable } from '@nestjs/common';
import { LotStatus, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { decimalToNumber } from '../../common/utils/decimal.util';
import {
  computeInventoryBalance,
  mergeBalances,
  type InventoryBalanceBreakdown,
} from '../../common/utils/inventory-balance.util';
import { PrismaService } from '../../prisma/prisma.service';
import { ShipmentAssemblyReservationService } from '../shipments/shipment-assembly-reservation.service';
import { InventoryBalanceQueryDto } from './dto/inventory-balance-query.dto';

export type InventoryBalanceRow = {
  productId: string;
  productSku: string;
  productName: string;
  lotId: string;
  lotNumber: string;
  lotStatus: LotStatus;
  expiryDate: string | null;
  location: string | null;
  minStock: number | null;
  reorderPoint: number | null;
} & InventoryBalanceBreakdown;

@Injectable()
export class InventoryBalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assemblyReservations: ShipmentAssemblyReservationService,
  ) {}

  async getBalance(
    query: InventoryBalanceQueryDto,
  ): Promise<PaginatedResponse<InventoryBalanceRow>> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const now = new Date();

    const lotWhere: Prisma.LotWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.lotId ? { id: query.lotId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.expiryBefore || query.expiryAfter
        ? {
            expiryDate: {
              ...(query.expiryBefore ? { lte: new Date(query.expiryBefore) } : {}),
              ...(query.expiryAfter ? { gte: new Date(query.expiryAfter) } : {}),
            },
          }
        : {}),
      inventoryRows: {
        some: {
          ...(query.location
            ? { location: { equals: query.location.trim(), mode: 'insensitive' } }
            : {}),
          quantity: { gt: 0 },
        },
      },
    };

    const [totalLots, lots] = await Promise.all([
      this.prisma.lot.count({ where: lotWhere }),
      this.prisma.lot.findMany({
        where: lotWhere,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { lotNumber: 'asc' }],
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              minStock: true,
              reorderPoint: true,
            },
          },
          inventoryRows: {
            where: {
              quantity: { gt: 0 },
              ...(query.location
                ? { location: { equals: query.location.trim(), mode: 'insensitive' } }
                : {}),
            },
            select: { quantity: true, location: true, reservedQuantity: true },
          },
        },
      }),
    ]);

    const items: InventoryBalanceRow[] = [];

    for (const lot of lots) {
      const byLocation = new Map<string | null, { qty: number; reserved: number }>();

      for (const row of lot.inventoryRows) {
        const loc = row.location ?? null;
        const prev = byLocation.get(loc) ?? { qty: 0, reserved: 0 };
        byLocation.set(loc, {
          qty: prev.qty + decimalToNumber(row.quantity),
          reserved:
            prev.reserved + decimalToNumber(row.reservedQuantity ?? 0),
        });
      }

      for (const [location, { qty, reserved }] of byLocation) {
        if (qty <= 0) continue;
        const breakdown = computeInventoryBalance(qty, {
          status: lot.status,
          expiryDate: lot.expiryDate,
          reservedQuantity: reserved,
        });

        items.push({
          productId: lot.productId,
          productSku: lot.product.sku,
          productName: lot.product.name,
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          lotStatus: lot.status,
          expiryDate: lot.expiryDate?.toISOString().slice(0, 10) ?? null,
          location,
          minStock: lot.product.minStock != null ? decimalToNumber(lot.product.minStock) : null,
          reorderPoint:
            lot.product.reorderPoint != null
              ? decimalToNumber(lot.product.reorderPoint)
              : null,
          ...breakdown,
        });
      }
    }

    return { items, total: totalLots, page, pageSize };
  }

  async getProductBalance(productId: string): Promise<InventoryBalanceBreakdown> {
    const rows = await this.prisma.inventoryItem.findMany({
      where: { productId, quantity: { gt: 0 } },
      include: { lot: { select: { status: true, expiryDate: true } } },
    });

    const balances = rows.map((row) =>
      computeInventoryBalance(decimalToNumber(row.quantity), {
        status: row.lot.status,
        expiryDate: row.lot.expiryDate,
        reservedQuantity: decimalToNumber(row.reservedQuantity ?? 0),
      }),
    );

    const merged = mergeBalances(balances);
    const assemblyReserved = await this.assemblyReservations.getReservedTotalByProductId(productId);
    if (assemblyReserved <= 0) return merged;

    return {
      ...merged,
      reservedQuantity: merged.reservedQuantity + assemblyReserved,
      availableQuantity: Math.max(0, merged.availableQuantity - assemblyReserved),
    };
  }

  async getLotBalance(lotId: string): Promise<InventoryBalanceBreakdown> {
    const lot = await this.prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        inventoryRows: { where: { quantity: { gt: 0 } } },
      },
    });
    if (!lot) {
      return {
        totalQuantity: 0,
        availableQuantity: 0,
        blockedQuantity: 0,
        quarantinedQuantity: 0,
        expiredQuantity: 0,
        reservedQuantity: 0,
      };
    }

    const balances = lot.inventoryRows.map((row) =>
      computeInventoryBalance(decimalToNumber(row.quantity), {
        status: lot.status,
        expiryDate: lot.expiryDate,
        reservedQuantity: decimalToNumber(row.reservedQuantity ?? 0),
      }),
    );

    return mergeBalances(balances);
  }
}
