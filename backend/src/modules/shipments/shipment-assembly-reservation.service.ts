import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { PrismaService } from '../../prisma/prisma.service';

export type ShipmentAssemblyHold = {
  quantity: number;
  reservedBy: string;
  shipmentId: string;
  shipmentStatus: ShipmentStatus;
  customerName: string | null;
};

type ReservationActor = {
  email: string;
  userId?: string;
};

type SyncLine = {
  productId: string;
  quantity: number;
};

/** Статусы отгрузки, при которых бронь удерживается в номенклатуре. */
export const ACTIVE_SHIPMENT_ASSEMBLY_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.NEW,
  ShipmentStatus.PICKING,
  ShipmentStatus.PICKING_ON_HOLD,
  ShipmentStatus.PICKED,
];

@Injectable()
export class ShipmentAssemblyReservationService implements OnModuleInit {
  private readonly logger = new Logger(ShipmentAssemblyReservationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const lines = await this.reconcileActiveShipments();
      if (lines > 0) {
        this.logger.log(`Синхронизировано броней на сборку: ${lines} поз.`);
      }
    } catch (err) {
      this.logger.error('Не удалось синхронизировать брони активных отгрузок', err);
    }
  }

  /** Восстановить брони для отгрузок, созданных до включения функции. */
  async reconcileActiveShipments(): Promise<number> {
    const shipments = await this.prisma.shipment.findMany({
      where: { status: { in: ACTIVE_SHIPMENT_ASSEMBLY_STATUSES } },
      select: {
        id: true,
        createdBy: true,
        items: { select: { productId: true, quantity: true } },
      },
    });

    let lineCount = 0;
    for (const shipment of shipments) {
      const lines = this.aggregateLines(shipment.items);
      if (!lines.length) continue;
      await this.syncForShipment(shipment.id, lines, {
        email: shipment.createdBy?.trim() || 'system',
      });
      lineCount += lines.length;
    }
    return lineCount;
  }

  aggregateLines(lines: Array<{ productId: string | null; quantity: Decimal | number | string }>): SyncLine[] {
    const byProduct = new Map<string, number>();
    for (const line of lines) {
      if (!line.productId) continue;
      const qty = decimalToNumber(line.quantity);
      if (qty <= 0) continue;
      byProduct.set(line.productId, (byProduct.get(line.productId) ?? 0) + qty);
    }
    return [...byProduct.entries()].map(([productId, quantity]) => ({ productId, quantity }));
  }

  async syncForShipment(
    shipmentId: string,
    lines: SyncLine[],
    actor: ReservationActor,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
      select: { status: true },
    });
    if (!shipment || !ACTIVE_SHIPMENT_ASSEMBLY_STATUSES.includes(shipment.status)) {
      await db.shipmentAssemblyReservation.deleteMany({ where: { shipmentId } });
      return;
    }

    const desired = new Map(lines.map((l) => [l.productId, l.quantity]));
    const existing = await db.shipmentAssemblyReservation.findMany({
      where: { shipmentId },
      select: { id: true, productId: true },
    });

    const toDelete = existing.filter((row) => !desired.has(row.productId)).map((row) => row.id);
    if (toDelete.length) {
      await db.shipmentAssemblyReservation.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const [productId, quantity] of desired) {
      await db.shipmentAssemblyReservation.upsert({
        where: { shipmentId_productId: { shipmentId, productId } },
        create: {
          shipmentId,
          productId,
          quantity: new Prisma.Decimal(quantity),
          reservedByEmail: actor.email,
          reservedByUserId: actor.userId ?? null,
        },
        update: {
          quantity: new Prisma.Decimal(quantity),
          reservedByEmail: actor.email,
          reservedByUserId: actor.userId ?? null,
        },
      });
    }
  }

  async releaseForShipment(shipmentId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx ?? this.prisma;
    await db.shipmentAssemblyReservation.deleteMany({ where: { shipmentId } });
  }

  async getReservedTotalByProductId(productId: string): Promise<number> {
    const rows = await this.prisma.shipmentAssemblyReservation.findMany({
      where: {
        productId,
        shipment: { status: { in: ACTIVE_SHIPMENT_ASSEMBLY_STATUSES } },
      },
      select: { quantity: true },
    });
    return rows.reduce((sum, row) => sum + decimalToNumber(row.quantity), 0);
  }

  async getReservedTotalsByProductIds(productIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!productIds.length) return map;

    const rows = await this.prisma.shipmentAssemblyReservation.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        shipment: { status: { in: ACTIVE_SHIPMENT_ASSEMBLY_STATUSES } },
      },
      _sum: { quantity: true },
    });

    for (const row of rows) {
      map.set(row.productId, decimalToNumber(row._sum.quantity ?? 0));
    }
    return map;
  }

  async getHoldsByProductIds(productIds: string[]): Promise<Map<string, ShipmentAssemblyHold[]>> {
    const map = new Map<string, ShipmentAssemblyHold[]>();
    if (!productIds.length) return map;

    const rows = await this.prisma.shipmentAssemblyReservation.findMany({
      where: {
        productId: { in: productIds },
        shipment: { status: { in: ACTIVE_SHIPMENT_ASSEMBLY_STATUSES } },
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        shipment: {
          select: {
            id: true,
            status: true,
            counterparty: { select: { name: true } },
          },
        },
      },
    });

    for (const row of rows) {
      const qty = decimalToNumber(row.quantity);
      if (qty <= 0) continue;
      const hold: ShipmentAssemblyHold = {
        quantity: qty,
        reservedBy: row.reservedByEmail,
        shipmentId: row.shipmentId,
        shipmentStatus: row.shipment.status,
        customerName: row.shipment.counterparty?.name ?? null,
      };
      const list = map.get(row.productId) ?? [];
      list.push(hold);
      map.set(row.productId, list);
    }

    return map;
  }
}
