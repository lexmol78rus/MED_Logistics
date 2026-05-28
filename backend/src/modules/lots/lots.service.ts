import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LotStatus, MovementType, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { expiryThresholdDates, resolveExpiryThresholds } from '../../common/utils/expiry-thresholds.util';
import { computeLotUiStatus } from '../../common/utils/inventory-status.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { LotsQueryDto } from './dto/lots-query.dto';
import { UpdateLotLocationDto } from './dto/update-lot-location.dto';
import { UpdateLotStatusDto } from './dto/update-lot-status.dto';
import { VoidLotDto } from './dto/void-lot.dto';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private async getExpiryThresholds() {
    const cfg = await this.settings.get();
    return resolveExpiryThresholds({
      warningDays: cfg.expiryWarningDays,
      criticalDays: cfg.expiryCriticalDays,
    });
  }

  async list(query: LotsQueryDto): Promise<PaginatedResponse<LotListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();

    const thresholds = await this.getExpiryThresholds();
    const { now, inCritical, inWarning } = expiryThresholdDates(new Date(), thresholds);

    const statusMap: Record<string, LotStatus> = {
      ОК: LotStatus.OK,
      ВНИМАНИЕ: LotStatus.WARNING,
      КАРАНТИН: LotStatus.QUARANTINE,
      БЛОК: LotStatus.BLOCKED,
    };

    let expiryFilter: Prisma.LotWhereInput = {};
    if (query.expiryWindow === 'lt30') {
      expiryFilter = { expiryDate: { lte: inCritical, gt: now } };
    } else if (query.expiryWindow === 'lt90') {
      expiryFilter = { expiryDate: { lte: inWarning, gt: inCritical } };
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
        status: computeLotUiStatus(lot.status, lot.expiryDate, qty, thresholds),
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
    const thresholds = await this.getExpiryThresholds();

    return {
      id: updated.id,
      productId: updated.productId,
      productName: updated.product.name,
      ref: updated.product.sku,
      lot: updated.lotNumber,
      expiryDate: updated.expiryDate?.toISOString().slice(0, 10) ?? null,
      qty,
      location,
      status: computeLotUiStatus(updated.status, updated.expiryDate, qty, thresholds),
      fefoRank: 0,
    };
  }

  async updateLocation(
    id: string,
    dto: UpdateLotLocationDto,
    actorEmail?: string,
  ): Promise<LotListItem> {
    const location = dto.location?.trim() || null;

    const lot = await this.prisma.lot.findUnique({
      where: { id },
      include: {
        product: { select: { sku: true, name: true } },
        inventoryRows: { select: { quantity: true, location: true } },
      },
    });
    if (!lot) throw new NotFoundException('Партия не найдена');
    if (lot.inventoryRows.length === 0) {
      throw new BadRequestException(
        'Нет складских записей по партии — задайте ячейку при приёмке',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.updateMany({
        where: { lotId: id },
        data: { location },
      });

      await tx.auditLog.create({
        data: {
          action: 'lot.location.update',
          entityType: 'lot',
          entityId: id,
          metadata: {
            lotNumber: lot.lotNumber,
            productId: lot.productId,
            location,
          },
        },
      });

      return tx.lot.findUniqueOrThrow({
        where: { id },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          inventoryRows: { select: { quantity: true, location: true } },
        },
      });
    });

    const qty = updated.inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.quantity),
      0,
    );
    const resolvedLocation =
      updated.inventoryRows.find((r) => r.location)?.location ?? null;
    const thresholds = await this.getExpiryThresholds();

    return {
      id: updated.id,
      productId: updated.productId,
      productName: updated.product.name,
      ref: updated.product.sku,
      lot: updated.lotNumber,
      expiryDate: updated.expiryDate?.toISOString().slice(0, 10) ?? null,
      qty,
      location: resolvedLocation,
      status: computeLotUiStatus(updated.status, updated.expiryDate, qty, thresholds),
      fefoRank: 0,
    };
  }

  async getRecallDetail(lotNumber: string) {
    const lot = await this.prisma.lot.findFirst({
      where: { lotNumber: { equals: lotNumber.trim(), mode: 'insensitive' } },
      include: {
        product: { select: { id: true, sku: true, name: true, manufacturer: true } },
        inventoryRows: {
          select: { quantity: true, location: true, reservedQuantity: true },
        },
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

    const reservedQty = lot.inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.reservedQuantity),
      0,
    );

    const voidBlockReason = this.resolveVoidBlockReason(qty, reservedQty, issuedQty);

    const siblingLotsRaw = await this.prisma.lot.findMany({
      where: {
        productId: lot.productId,
        id: { not: lot.id },
      },
      select: {
        lotNumber: true,
        expiryDate: true,
        inventoryRows: { select: { quantity: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: 30,
    });

    const siblingLots = siblingLotsRaw
      .map((s) => ({
        lotNumber: s.lotNumber,
        qty: s.inventoryRows.reduce(
          (sum, row) => sum + decimalToNumber(row.quantity),
          0,
        ),
        expiryDate: s.expiryDate,
      }))
      .sort((a, b) => {
        const aHas = a.qty > 0 ? 1 : 0;
        const bHas = b.qty > 0 ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        const aExp = a.expiryDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bExp = b.expiryDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aExp - bExp;
      });

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
      voidable: voidBlockReason === null,
      voidBlockReason,
      requiresTransfer: qty > 0,
      siblingLots: siblingLots.map((s) => ({
        lot: s.lotNumber,
        qty: s.qty,
      })),
      movements: lot.movements.map((m) => ({
        reference: m.reference,
        type: TYPE_LABELS[m.type],
        quantity: decimalToNumber(m.quantity),
        date: m.createdAt.toISOString(),
        actor: m.actorEmail,
      })),
    };
  }

  async voidLot(id: string, dto: VoidLotDto, actorEmail?: string): Promise<{ success: true }> {
    const comment = dto.comment.trim();
    const transferLotNumber = dto.transferToLotNumber?.trim().toUpperCase();

    const lot = await this.prisma.lot.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        inventoryRows: true,
        movements: { where: { type: MovementType.ISSUE }, select: { quantity: true } },
      },
    });
    if (!lot) throw new NotFoundException('Партия не найдена');

    const qty = lot.inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.quantity),
      0,
    );
    const reservedQty = lot.inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.reservedQuantity),
      0,
    );
    const issuedQty = lot.movements.reduce(
      (sum, m) => sum + decimalToNumber(m.quantity),
      0,
    );

    const blockReason = this.resolveVoidBlockReason(qty, reservedQty, issuedQty);
    if (blockReason) {
      throw new BadRequestException(blockReason);
    }

    if (qty > 0) {
      if (!transferLotNumber) {
        throw new BadRequestException(
          'На ошибочной партии есть остаток — укажите LOT корректной партии для переноса',
        );
      }
      if (transferLotNumber === lot.lotNumber.toUpperCase()) {
        throw new BadRequestException('Партия-получатель должна отличаться от удаляемой');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (qty > 0 && transferLotNumber) {
        const targetLot = await tx.lot.findUnique({
          where: {
            productId_lotNumber: {
              productId: lot.productId,
              lotNumber: transferLotNumber,
            },
          },
        });
        if (!targetLot) {
          throw new NotFoundException(
            `Партия ${transferLotNumber} не найдена у этого товара — создайте её приёмкой или выберите существующую`,
          );
        }
        if (targetLot.status === LotStatus.BLOCKED) {
          throw new BadRequestException(
            'Партия-получатель заблокирована — сначала разблокируйте или выберите другую',
          );
        }

        await this.transferInventoryForVoid(
          tx,
          lot.id,
          targetLot.id,
          lot.productId,
          comment,
          actorEmail,
        );
      }

      await tx.stockMovement.create({
        data: {
          reference: await this.nextReference(tx),
          productId: lot.productId,
          lotId: lot.id,
          type: MovementType.ADJUSTMENT,
          quantity: 0,
          actorEmail: actorEmail ?? null,
          editReason: comment,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'lot.void',
          entityType: 'lot',
          entityId: id,
          metadata: {
            lotNumber: lot.lotNumber,
            productId: lot.productId,
            productSku: lot.product.sku,
            comment,
            transferToLotNumber: transferLotNumber ?? null,
            qtyBeforeVoid: qty,
          },
        },
      });

      await tx.lot.delete({ where: { id } });
    });

    return { success: true };
  }

  private resolveVoidBlockReason(
    qty: number,
    reservedQty: number,
    issuedQty: number,
  ): string | null {
    if (issuedQty > 0) {
      return 'По партии уже были отгрузки — удаление невозможно, история должна сохраниться для аудита';
    }
    if (reservedQty > 0) {
      return 'На партии есть зарезервированный остаток — завершите или отмените резервирование';
    }
    return null;
  }

  private async transferInventoryForVoid(
    tx: Prisma.TransactionClient,
    sourceLotId: string,
    targetLotId: string,
    productId: string,
    comment: string,
    actorEmail?: string,
  ): Promise<void> {
    const sourceItems = await tx.inventoryItem.findMany({
      where: { lotId: sourceLotId },
    });

    const operationGroupId = `void-${sourceLotId}-${Date.now()}`;
    const transferNote = `Перенос при удалении ошибочной партии: ${comment}`;

    for (const item of sourceItems) {
      const qty = decimalToNumber(item.quantity);
      if (qty <= 0) continue;

      const qtyDecimal = item.quantity;

      await tx.stockMovement.create({
        data: {
          reference: await this.nextReference(tx),
          productId,
          lotId: sourceLotId,
          type: MovementType.ISSUE,
          quantity: qtyDecimal,
          actorEmail: actorEmail ?? null,
          operationGroupId,
          editReason: transferNote,
        },
      });

      await tx.stockMovement.create({
        data: {
          reference: await this.nextReference(tx),
          productId,
          lotId: targetLotId,
          type: MovementType.RECEIPT,
          quantity: qtyDecimal,
          actorEmail: actorEmail ?? null,
          operationGroupId,
          editReason: transferNote,
        },
      });

      const existingTarget = await tx.inventoryItem.findFirst({
        where: {
          productId,
          lotId: targetLotId,
          location: item.location,
        },
      });

      if (existingTarget) {
        await tx.inventoryItem.update({
          where: { id: existingTarget.id },
          data: { quantity: { increment: qtyDecimal } },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            productId,
            lotId: targetLotId,
            quantity: qtyDecimal,
            location: item.location,
          },
        });
      }

      await tx.inventoryItem.delete({ where: { id: item.id } });
    }

    await tx.barcodeRecord.updateMany({
      where: { lotId: sourceLotId },
      data: { lotId: targetLotId },
    });
  }

  private async nextReference(tx: Prisma.TransactionClient): Promise<string> {
    // IMPORTANT: must be unique under concurrency.
    // Previous implementation used COUNT()+1 which collides with parallel transactions.
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = crypto.randomUUID().slice(0, 8).toUpperCase();
    return `ПЕР-${ts}-${rnd}`;
  }
}
