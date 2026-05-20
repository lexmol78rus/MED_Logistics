import { Injectable, NotFoundException } from '@nestjs/common';
import { LotStatus, MovementType, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { computeLotUiStatus } from '../../common/utils/inventory-status.util';
import { PrismaService } from '../../prisma/prisma.service';
import { LotsQueryDto } from './dto/lots-query.dto';
import { UpdateLotStatusDto } from './dto/update-lot-status.dto';

export type LotListItem = {
  id: string;
  productId: string;
  productName: string;
  ref: string;
  lot: string;
  expiryDate: string | null;
  qty: number;
  location: string | null;
  status: string;
  fefoRank: number;
};

@Injectable()
export class LotsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LotsQueryDto): Promise<PaginatedResponse<LotListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const statusMap: Record<string, LotStatus> = {
      ОК: LotStatus.OK,
      ВНИМАНИЕ: LotStatus.WARNING,
      КАРАНТИН: LotStatus.QUARANTINE,
      БЛОК: LotStatus.BLOCKED,
    };

    let expiryFilter: Prisma.LotWhereInput = {};
    if (query.expiryWindow === 'lt30') {
      expiryFilter = { expiryDate: { lte: in30, gt: now } };
    } else if (query.expiryWindow === 'lt90') {
      expiryFilter = { expiryDate: { lte: in90, gt: in30 } };
    } else if (query.expiryWindow === 'expired') {
      expiryFilter = { expiryDate: { lte: now } };
    }

    const where: Prisma.LotWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.quarantined ? { status: LotStatus.QUARANTINE } : {}),
      ...(query.blocked ? { status: LotStatus.BLOCKED } : {}),
      ...(query.status && statusMap[query.status]
        ? { status: statusMap[query.status] }
        : {}),
      ...expiryFilter,
      ...(search
        ? {
            OR: [
              { lotNumber: { contains: search, mode: 'insensitive' } },
              { product: { sku: { contains: search, mode: 'insensitive' } } },
              { product: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.LotOrderByWithRelationInput[] = query.fefo
      ? [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { lotNumber: 'asc' }]
      : [{ createdAt: 'desc' }];

    const [total, lots] = await Promise.all([
      this.prisma.lot.count({ where }),
      this.prisma.lot.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          product: { select: { id: true, sku: true, name: true } },
          inventoryRows: { select: { quantity: true, location: true } },
        },
      }),
    ]);

    const items = lots.map((lot, index) => {
      const qty = lot.inventoryRows.reduce(
        (sum, row) => sum + decimalToNumber(row.quantity),
        0,
      );
      const location =
        lot.inventoryRows.find((r) => r.location)?.location ?? null;

      return {
        id: lot.id,
        productId: lot.productId,
        productName: lot.product.name,
        ref: lot.product.sku,
        lot: lot.lotNumber,
        expiryDate: lot.expiryDate?.toISOString().slice(0, 10) ?? null,
        qty,
        location,
        status: computeLotUiStatus(lot.status, lot.expiryDate, qty),
        fefoRank: (page - 1) * pageSize + index + 1,
      };
    });

    return { items, total, page, pageSize };
  }

  async updateStatus(
    id: string,
    dto: UpdateLotStatusDto,
    actorEmail?: string,
  ): Promise<LotListItem> {
    const lot = await this.prisma.lot.findUnique({
      where: { id },
      include: {
        product: { select: { sku: true, name: true } },
        inventoryRows: { select: { quantity: true, location: true } },
      },
    });
    if (!lot) throw new NotFoundException('Партия не найдена');

    const movementType =
      dto.status === LotStatus.QUARANTINE
        ? MovementType.QUARANTINE
        : dto.status === LotStatus.BLOCKED
          ? dto.recall
            ? MovementType.RECALL
            : MovementType.BLOCK
          : dto.status === LotStatus.OK
            ? MovementType.UNBLOCK
            : MovementType.ADJUSTMENT;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.lot.update({
        where: { id },
        data: { status: dto.status },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          inventoryRows: { select: { quantity: true, location: true } },
        },
      });

      if (dto.status === LotStatus.QUARANTINE || dto.status === LotStatus.BLOCKED || dto.status === LotStatus.OK) {
        await tx.stockMovement.create({
          data: {
            reference: await this.nextReference(tx),
            productId: row.productId,
            lotId: row.id,
            type: movementType,
            quantity: 0,
            actorEmail: actorEmail ?? null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: `lot.status.${dto.status.toLowerCase()}`,
          entityType: 'lot',
          entityId: id,
          metadata: { status: dto.status },
        },
      });

      return row;
    });

    const qty = updated.inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.quantity),
      0,
    );
    const location =
      updated.inventoryRows.find((r) => r.location)?.location ?? null;

    return {
      id: updated.id,
      productId: updated.productId,
      productName: updated.product.name,
      ref: updated.product.sku,
      lot: updated.lotNumber,
      expiryDate: updated.expiryDate?.toISOString().slice(0, 10) ?? null,
      qty,
      location,
      status: computeLotUiStatus(updated.status, updated.expiryDate, qty),
      fefoRank: 0,
    };
  }

  async getRecallDetail(lotNumber: string) {
    const lot = await this.prisma.lot.findFirst({
      where: { lotNumber: { equals: lotNumber.trim(), mode: 'insensitive' } },
      include: {
        product: { select: { id: true, sku: true, name: true, manufacturer: true } },
        inventoryRows: { select: { quantity: true, location: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { product: { select: { sku: true } } },
        },
      },
    });
    if (!lot) throw new NotFoundException('Партия не найдена');

    const qty = lot.inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.quantity),
      0,
    );
    const locations = [
      ...new Set(
        lot.inventoryRows
          .filter((r) => r.location)
          .map((r) => r.location as string),
      ),
    ];

    const issuedQty = lot.movements
      .filter((m) => m.type === MovementType.ISSUE)
      .reduce((sum, m) => sum + decimalToNumber(m.quantity), 0);

    const TYPE_LABELS: Record<MovementType, string> = {
      RECEIPT: 'ПРИХОД',
      ISSUE: 'РАСХОД',
      ADJUSTMENT: 'КОРРЕКТИРОВКА',
      QUARANTINE: 'КАРАНТИН',
      UNBLOCK: 'РАЗБЛОКИРОВКА',
      RECALL: 'ОТЗЫВ',
      BLOCK: 'БЛОКИРОВКА',
    };

    const statusLabel =
      lot.status === LotStatus.QUARANTINE
        ? 'Карантин'
        : lot.status === LotStatus.BLOCKED
          ? 'Заблокировано'
          : 'Активно';

    return {
      id: lot.id,
      lot: lot.lotNumber,
      ref: lot.product.sku,
      productId: lot.product.id,
      name: lot.product.name,
      manufacturer: lot.product.manufacturer,
      expiry: lot.expiryDate?.toISOString().slice(0, 10) ?? null,
      status: statusLabel,
      dbStatus: lot.status,
      qty,
      locations,
      distributed: issuedQty,
      movements: lot.movements.map((m) => ({
        reference: m.reference,
        type: TYPE_LABELS[m.type],
        quantity: decimalToNumber(m.quantity),
        date: m.createdAt.toISOString(),
        actor: m.actorEmail,
      })),
    };
  }

  private async nextReference(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.stockMovement.count();
    return `ПЕР-${String(count + 1).padStart(4, '0')}`;
  }
}
