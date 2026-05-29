import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LotStatus, MovementType, Prisma } from '@prisma/client';
import { SearchPaginationQueryDto } from '../../common/dto/search-pagination-query.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ScannerService } from '../scanner/scanner.service';
import { InventoryBalanceService } from './inventory-balance.service';
import { InventoryValidationService } from './inventory-validation.service';
import { ReceiveInventoryDto } from './dto/receive-inventory.dto';
import { WriteoffInventoryDto } from './dto/writeoff-inventory.dto';
import { WriteoffBatchDto, WriteoffBatchItemDto } from './dto/writeoff-batch.dto';
import {
  CorrectWriteoffAdditionDto,
  CorrectWriteoffGroupDto,
  CorrectWriteoffLineDto,
} from './dto/correct-writeoff-group.dto';
import { resolveProductIdFromBarcode } from '../../common/barcode-lookup';
import { normalizeScannedBarcode } from '../../common/barcode-normalize';
import { WriteoffRecommendationQueryDto } from './dto/writeoff-recommendation-query.dto';
import {
  computeWriteoffAvailableQuantity,
  isLotExpired,
} from '../../common/utils/inventory-balance.util';
import { resolveWriteoffDestinationLabel } from '../../common/utils/writeoff-destination-label';
import { WriteoffDestinationsService } from '../writeoff-destinations/writeoff-destinations.service';
import { ExpectedReceiptsService } from '../expected-receipts/expected-receipts.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { formatShipmentWriteoffMovementComment } from '../../common/utils/shipment-picking-outcome.util';

export type WriteoffLotRecommendation = {
  lotId: string;
  lot: string;
  expiry: string;
  qty: number;
  fefo: boolean;
  expired: boolean;
};

export type WriteoffRecommendation = {
  productId: string;
  name: string;
  ref: string;
  totalQty: number;
  lots: WriteoffLotRecommendation[];
};

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: ScannerService,
    private readonly balance: InventoryBalanceService,
    private readonly validation: InventoryValidationService,
    private readonly settings: SettingsService,
    private readonly writeoffDestinations: WriteoffDestinationsService,
    private readonly expectedReceipts: ExpectedReceiptsService,
    private readonly shipments: ShipmentsService,
  ) {}

  async list(query: SearchPaginationQueryDto) {
    return this.balance.getBalance({
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async receive(dto: ReceiveInventoryDto, actorEmail?: string, actorId?: string) {
    this.logger.log(
      `receive productId=${dto.productId ?? '-'} lot=${dto.lotNumber} qty=${dto.quantity}`,
    );
    let productId = dto.productId;

    if (!productId && dto.barcode) {
      const scan = await this.scanner.process(dto.barcode);
      if (!scan.found || !scan.product) {
        throw new NotFoundException('Товар по штрихкоду не найден');
      }
      productId = scan.product.id;
    }

    if (!productId) {
      throw new BadRequestException('Укажите productId или barcode');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Товар не найден');

    const expiryDate = new Date(dto.expiryDate);
    const expiryDay = new Date(
      Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth(), expiryDate.getUTCDate()),
    );
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getMonth(), today.getDate()));
    if (expiryDay.getTime() < todayUtc.getTime()) {
      const ru =
        `${String(expiryDate.getUTCDate()).padStart(2, '0')}.` +
        `${String(expiryDate.getUTCMonth() + 1).padStart(2, '0')}.` +
        `${expiryDate.getUTCFullYear()}`;
      throw new BadRequestException(
        `Приёмка заблокирована: срок годности ${ru} уже истёк. Товар принять на склад нельзя.`,
      );
    }

    const lotNumber = dto.lotNumber.trim().toUpperCase();
    const quantity = new Prisma.Decimal(dto.quantity);

    const result = await this.prisma.$transaction(async (tx) => {
      const lot = await tx.lot.upsert({
        where: { productId_lotNumber: { productId, lotNumber } },
        create: {
          productId,
          lotNumber,
          expiryDate,
          status: LotStatus.OK,
        },
        update: { expiryDate },
      });

      const existingItem = await tx.inventoryItem.findFirst({
        where: { productId, lotId: lot.id, location: dto.location ?? null },
      });

      if (existingItem) {
        await tx.inventoryItem.update({
          where: { id: existingItem.id },
          data: { quantity: { increment: quantity } },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            productId,
            lotId: lot.id,
            quantity,
            location: dto.location?.trim() || null,
          },
        });
      }

      if (dto.barcode) {
        await tx.barcodeRecord.upsert({
          where: { barcode: dto.barcode.trim() },
          create: { barcode: dto.barcode.trim(), productId, lotId: lot.id },
          update: { productId, lotId: lot.id },
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          reference: await this.nextReference(tx),
          productId,
          lotId: lot.id,
          type: MovementType.RECEIPT,
          quantity,
          actorEmail: actorEmail ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action: 'inventory.receive',
          entityType: 'lot',
          entityId: lot.id,
          metadata: {
            productId,
            lotNumber,
            quantity: dto.quantity,
            expectedReceiptId: dto.expectedReceiptId ?? null,
          },
        },
      });

      if (dto.expectedReceiptId) {
        await this.expectedReceipts.applyReceiveLink(
          dto.expectedReceiptId,
          productId,
          dto.quantity,
          actorEmail,
          actorId,
          tx,
        );
      }

      return { lot, movement };
    });

    return {
      success: true,
      lotId: result.lot.id,
      movementId: result.movement.reference,
      expectedReceiptLinked: !!dto.expectedReceiptId,
    };
  }

  async writeoffRecommendation(
    query: WriteoffRecommendationQueryDto,
  ): Promise<WriteoffRecommendation> {
    let productId = query.productId;

    if (!productId && query.q) {
      productId = await this.resolveProductIdByQuery(query.q);
    }

    if (!productId) throw new NotFoundException('Товар не найден');

    const useFefo = query.useFefoRecommendations !== false;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        lots: {
          include: { inventoryRows: true },
          orderBy: useFefo
            ? [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { lotNumber: 'asc' }]
            : [{ lotNumber: 'asc' }],
        },
      },
    });

    if (!product) throw new NotFoundException('Товар не найден');

    const availableLots = product.lots
      .map((lot) => {
        const qty = lot.inventoryRows.reduce(
          (sum, row) => sum + decimalToNumber(row.quantity),
          0,
        );
        const writeoffQty = computeWriteoffAvailableQuantity(qty, {
          status: lot.status,
          expiryDate: lot.expiryDate,
        });
        return { lot, qty, writeoffQty };
      })
      .filter(({ writeoffQty }) => writeoffQty > 0);

    const totalQty = availableLots.reduce((sum, { writeoffQty }) => sum + writeoffQty, 0);
    const allExpired =
      availableLots.length > 0 &&
      availableLots.every(({ lot }) => isLotExpired(lot.expiryDate));

    const lots: WriteoffLotRecommendation[] = availableLots.map(({ lot, writeoffQty }, index) => ({
      lotId: lot.id,
      lot: lot.lotNumber,
      expiry: lot.expiryDate?.toISOString().slice(0, 10) ?? 'Н/Д',
      qty: writeoffQty,
      fefo: useFefo && !allExpired && index === 0,
      expired: isLotExpired(lot.expiryDate),
    }));

    return {
      productId: product.id,
      name: product.name,
      ref: product.sku,
      totalQty,
      lots,
    };
  }

  async writeoff(dto: WriteoffInventoryDto, actorEmail?: string, actorId?: string) {
    this.logger.log(
      `writeoff productId=${dto.productId} destinationId=${dto.writeOffDestinationId} lines=${dto.lines.length}`,
    );
    await this.assertWriteoffProductExists(dto.productId);
    await this.logFefoViolationsForItem(dto, actorId);
    const references = await this.executeWriteoffItems(
      [dto],
      actorEmail,
      actorId,
      'inventory.writeoff',
      { shipmentId: dto.shipmentId },
    );
    if (dto.shipmentId) {
      await this.shipments.finalizeWriteoff(dto.shipmentId, actorEmail);
    }
    return { success: true, movementIds: references };
  }

  async writeoffBatch(dto: WriteoffBatchDto, actorEmail?: string, actorId?: string) {
    this.logger.log(`writeoffBatch items=${dto.items.length} shipmentId=${dto.shipmentId ?? '—'}`);
    if (dto.shipmentId) {
      await this.shipments.getWriteoffContext(dto.shipmentId);
    }
    for (const item of dto.items) {
      await this.assertWriteoffProductExists(item.productId);
      await this.logFefoViolationsForItem(item, actorId);
    }
    const references = await this.executeWriteoffItems(
      dto.items,
      actorEmail,
      actorId,
      'inventory.writeoff.batch',
      { shipmentId: dto.shipmentId },
    );
    if (dto.shipmentId) {
      await this.shipments.finalizeWriteoff(dto.shipmentId, actorEmail);
    }
    return { success: true, movementIds: references, shipmentId: dto.shipmentId ?? null };
  }

  async correctWriteoffGroup(
    dto: CorrectWriteoffGroupDto,
    actorEmail?: string,
    actorId?: string,
  ) {
    const updates = dto.updates ?? [];
    const additions = dto.additions ?? [];
    if (updates.length === 0 && additions.length === 0) {
      throw new BadRequestException('Укажите изменения позиций или новые строки');
    }
    if (!dto.operationGroupId && !dto.movementReferences?.length) {
      throw new BadRequestException('Укажите operationGroupId или movementReferences');
    }

    const editReason = dto.editReason.trim();
    const correctionSessionId = crypto.randomUUID();

    const roots = await this.resolveWriteoffRootMovements(dto);
    if (roots.length === 0) {
      throw new NotFoundException('Списание не найдено');
    }

    const rootByRef = new Map(roots.map((m) => [m.reference, m]));
    const operationGroupId =
      dto.operationGroupId ?? roots[0].operationGroupId ?? correctionSessionId;

    const correctionRefs: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const line of updates) {
        const root = rootByRef.get(line.reference);
        if (!root) {
          throw new NotFoundException(`Движение ${line.reference} не найдено в группе`);
        }
        if (root.type !== MovementType.ISSUE || root.correctedMovementId) {
          throw new BadRequestException(`Позиция ${line.reference} недоступна для редактирования`);
        }

        const effective = await this.getEffectiveWriteoffQty(root.id, tx);
        const targetQty = line.remove ? 0 : line.newQuantity;
        if (targetQty === undefined) {
          throw new BadRequestException(`Укажите newQuantity для ${line.reference}`);
        }
        if (targetQty < 0) {
          throw new BadRequestException('Количество не может быть отрицательным');
        }

        const delta = targetQty - effective;
        if (delta === 0) continue;

        const refs = await this.applyWriteoffCorrectionDelta(
          root,
          delta,
          editReason,
          correctionSessionId,
          operationGroupId,
          actorEmail,
          tx,
        );
        correctionRefs.push(...refs);
      }

      for (const addition of additions) {
        const destination = await this.writeoffDestinations.assertActiveDestination(
          addition.writeOffDestinationId,
        );
        const refs = await this.executeWriteoffAdditionCorrection(
          addition,
          destination,
          operationGroupId,
          correctionSessionId,
          editReason,
          actorEmail,
          tx,
        );
        correctionRefs.push(...refs);
      }

      await tx.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action: 'inventory.writeoff.correct',
          entityType: 'writeoff_correction',
          entityId: operationGroupId,
          metadata: {
            operationGroupId,
            correctionSessionId,
            editReason,
            correctionReferences: correctionRefs,
            updatedReferences: updates.map((u) => u.reference),
            additions: additions.map((a) => ({
              productId: a.productId,
              lotId: a.lotId,
              quantity: a.quantity,
            })),
          },
        },
      });
    });

    return {
      success: true,
      correctionSessionId,
      movementIds: correctionRefs,
    };
  }

  private async resolveWriteoffRootMovements(dto: CorrectWriteoffGroupDto) {
    const where: Prisma.StockMovementWhereInput = {
      type: MovementType.ISSUE,
      correctedMovementId: null,
      ...(dto.operationGroupId ? { operationGroupId: dto.operationGroupId } : {}),
      ...(dto.movementReferences?.length
        ? { reference: { in: dto.movementReferences } }
        : {}),
    };

    return this.prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true } },
        lot: { select: { id: true, status: true, expiryDate: true } },
        destination: true,
      },
    });
  }

  private async getEffectiveWriteoffQty(
    rootMovementId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const root = await tx.stockMovement.findUnique({ where: { id: rootMovementId } });
    if (!root || root.type !== MovementType.ISSUE) return 0;

    let issued = decimalToNumber(root.quantity);
    const corrections = await tx.stockMovement.findMany({
      where: { correctedMovementId: rootMovementId },
    });

    for (const c of corrections) {
      const q = decimalToNumber(c.quantity);
      if (c.type === MovementType.ISSUE) issued += q;
      else if (c.type === MovementType.ADJUSTMENT) issued -= q;
    }

    return Math.max(0, issued);
  }

  private async applyWriteoffCorrectionDelta(
    root: Prisma.StockMovementGetPayload<{
      include: { product: { select: { id: true } }; lot: { select: { id: true; status: true; expiryDate: true } }; destination: true };
    }>,
    delta: number,
    editReason: string,
    correctionSessionId: string,
    operationGroupId: string,
    actorEmail: string | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<string[]> {
    const refs: string[] = [];

    if (delta < 0) {
      const returnQty = Math.abs(delta);
      await this.returnQuantityToInventory(
        root.productId,
        root.lotId!,
        returnQty,
        tx,
      );
      const movement = await tx.stockMovement.create({
        data: {
          reference: await this.nextReference(tx),
          productId: root.productId,
          lotId: root.lotId,
          type: MovementType.ADJUSTMENT,
          quantity: new Prisma.Decimal(returnQty),
          actorEmail: actorEmail ?? null,
          writeOffDestinationId: root.writeOffDestinationId,
          writeOffDestination: root.writeOffDestination,
          writeOffComment: root.writeOffComment,
          operationGroupId,
          correctedMovementId: root.id,
          correctionSessionId,
          editReason,
        },
      });
      refs.push(movement.reference);
      return refs;
    }

    const additionalQty = delta;
    const lot = root.lot;
    if (!lot) throw new NotFoundException('Партия не найдена');

    const inventoryRows = await tx.inventoryItem.findMany({
      where: { productId: root.productId, lotId: lot.id },
    });
    const total = inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.quantity),
      0,
    );
    const writeoffAvailable = computeWriteoffAvailableQuantity(total, {
      status: lot.status,
      expiryDate: lot.expiryDate,
    });

    this.validation.assertWriteoffAllowed(
      lot.status,
      lot.expiryDate,
      additionalQty,
      writeoffAvailable,
    );

    let remaining = additionalQty;
    for (const row of inventoryRows) {
      if (remaining <= 0) break;
      const current = decimalToNumber(row.quantity);
      const deduct = Math.min(current, remaining);
      const newQty = current - deduct;
      remaining -= deduct;

      if (newQty <= 0) {
        await tx.inventoryItem.delete({ where: { id: row.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: row.id },
          data: { quantity: new Prisma.Decimal(newQty) },
        });
      }
    }

    const movement = await tx.stockMovement.create({
      data: {
        reference: await this.nextReference(tx),
        productId: root.productId,
        lotId: root.lotId,
        type: MovementType.ISSUE,
        quantity: new Prisma.Decimal(additionalQty),
        actorEmail: actorEmail ?? null,
        writeOffDestinationId: root.writeOffDestinationId,
        writeOffDestination: root.writeOffDestination,
        writeOffComment: root.writeOffComment,
        operationGroupId,
        correctedMovementId: root.id,
        correctionSessionId,
        editReason,
      },
    });
    refs.push(movement.reference);
    return refs;
  }

  private async executeWriteoffAdditionCorrection(
    addition: CorrectWriteoffAdditionDto,
    destination: Awaited<ReturnType<WriteoffDestinationsService['assertActiveDestination']>>,
    operationGroupId: string,
    correctionSessionId: string,
    editReason: string,
    actorEmail: string | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<string[]> {
    const lot = await tx.lot.findUnique({ where: { id: addition.lotId } });
    if (!lot) throw new NotFoundException('Партия не найдена');
    if (lot.productId !== addition.productId) {
      throw new BadRequestException('Партия не принадлежит выбранному товару');
    }

    const inventoryRows = await tx.inventoryItem.findMany({
      where: { productId: addition.productId, lotId: addition.lotId },
    });
    const total = inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.quantity),
      0,
    );
    const writeoffAvailable = computeWriteoffAvailableQuantity(total, {
      status: lot.status,
      expiryDate: lot.expiryDate,
    });

    this.validation.assertWriteoffAllowed(
      lot.status,
      lot.expiryDate,
      addition.quantity,
      writeoffAvailable,
    );

    let remaining = addition.quantity;
    for (const row of inventoryRows) {
      if (remaining <= 0) break;
      const current = decimalToNumber(row.quantity);
      const deduct = Math.min(current, remaining);
      const newQty = current - deduct;
      remaining -= deduct;

      if (newQty <= 0) {
        await tx.inventoryItem.delete({ where: { id: row.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: row.id },
          data: { quantity: new Prisma.Decimal(newQty) },
        });
      }
    }

    const movement = await tx.stockMovement.create({
      data: {
        reference: await this.nextReference(tx),
        productId: addition.productId,
        lotId: addition.lotId,
        type: MovementType.ISSUE,
        quantity: new Prisma.Decimal(addition.quantity),
        actorEmail: actorEmail ?? null,
        writeOffDestinationId: destination.id,
        writeOffDestination: destination.legacyCode,
        writeOffComment: addition.writeOffComment?.trim() || null,
        operationGroupId,
        correctionSessionId,
        editReason,
      },
    });

    return [movement.reference];
  }

  private async returnQuantityToInventory(
    productId: string,
    lotId: string,
    quantity: number,
    tx: Prisma.TransactionClient,
  ) {
    const existing = await tx.inventoryItem.findFirst({
      where: { productId, lotId },
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      await tx.inventoryItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: new Prisma.Decimal(quantity) } },
      });
    } else {
      await tx.inventoryItem.create({
        data: {
          productId,
          lotId,
          quantity: new Prisma.Decimal(quantity),
        },
      });
    }
  }

  private async assertWriteoffProductExists(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Товар не найден');
  }

  private async logFefoViolationsForItem(
    item: Pick<WriteoffInventoryDto, 'productId' | 'lines' | 'useFefoRecommendations'>,
    actorId?: string,
  ) {
    const cfg = await this.settings.get();
    const useFefo = item.useFefoRecommendations !== false;
    if (!useFefo || !cfg.fefoEnabled) return;

    const recommendation = await this.writeoffRecommendation({
      productId: item.productId,
      useFefoRecommendations: true,
    });
    const fefoLotId = recommendation.lots.find((l) => l.fefo)?.lotId;
    const nonFefoWithQty = item.lines.filter(
      (line) => line.lotId !== fefoLotId && line.quantity > 0,
    );
    if (nonFefoWithQty.length > 0 && fefoLotId) {
      await this.validation.logFefoViolation(
        item.productId,
        fefoLotId,
        nonFefoWithQty[0].lotId,
        actorId,
      );
    }
  }

  private countActiveWriteoffLines(
    items: Pick<WriteoffBatchItemDto, 'lines'>[],
  ): number {
    return items.reduce(
      (sum, item) => sum + item.lines.filter((line) => line.quantity > 0).length,
      0,
    );
  }

  private async executeWriteoffItems(
    items: WriteoffBatchItemDto[],
    actorEmail: string | undefined,
    actorId: string | undefined,
    auditAction: 'inventory.writeoff' | 'inventory.writeoff.batch',
    options?: { shipmentId?: string },
  ): Promise<string[]> {
    const shipmentId = options?.shipmentId?.trim() || null;
    const shipmentCtx = shipmentId
      ? await this.shipments.getWriteoffContext(shipmentId)
      : null;
    const destinationById = new Map<
      string,
      Awaited<ReturnType<WriteoffDestinationsService['assertActiveDestination']>>
    >();

    for (const item of items) {
      if (!destinationById.has(item.writeOffDestinationId)) {
        destinationById.set(
          item.writeOffDestinationId,
          await this.writeoffDestinations.assertActiveDestination(
            item.writeOffDestinationId,
          ),
        );
      }
    }

    const activeLineCount = this.countActiveWriteoffLines(items);
    const sharedGroupId = activeLineCount > 1 ? crypto.randomUUID() : null;

    return this.prisma.$transaction(async (tx) => {
      const references: string[] = [];
      const auditItems: Array<Record<string, unknown>> = [];

      for (const item of items) {
        const destination = destinationById.get(item.writeOffDestinationId)!;
        const itemReferences: string[] = [];
        const itemLineCount = item.lines.filter((line) => line.quantity > 0).length;
        const itemGroupId =
          itemLineCount > 1 && activeLineCount === 1 ? crypto.randomUUID() : sharedGroupId;

        for (const line of item.lines) {
          if (line.quantity <= 0) continue;

          const lot = await tx.lot.findUnique({ where: { id: line.lotId } });
          if (!lot) throw new NotFoundException('Партия не найдена');

          const inventoryRows = await tx.inventoryItem.findMany({
            where: { productId: item.productId, lotId: line.lotId },
          });

          const total = inventoryRows.reduce(
            (sum, row) => sum + decimalToNumber(row.quantity),
            0,
          );
          const writeoffAvailable = computeWriteoffAvailableQuantity(total, {
            status: lot.status,
            expiryDate: lot.expiryDate,
          });

          this.validation.assertWriteoffAllowed(
            lot.status,
            lot.expiryDate,
            line.quantity,
            writeoffAvailable,
          );

          let remaining = line.quantity;
          for (const row of inventoryRows) {
            if (remaining <= 0) break;
            const current = decimalToNumber(row.quantity);
            const deduct = Math.min(current, remaining);
            const newQty = current - deduct;
            remaining -= deduct;

            if (newQty <= 0) {
              await tx.inventoryItem.delete({ where: { id: row.id } });
            } else {
              await tx.inventoryItem.update({
                where: { id: row.id },
                data: { quantity: new Prisma.Decimal(newQty) },
              });
            }
          }

          const movementComment = shipmentCtx
            ? formatShipmentWriteoffMovementComment({
                shipmentId: shipmentCtx.id,
                contractNumber: shipmentCtx.contract?.number ?? null,
                counterpartyName: shipmentCtx.counterparty?.name ?? null,
                itemComment: item.writeOffComment,
              })
            : item.writeOffComment?.trim() || null;

          const movement = await tx.stockMovement.create({
            data: {
              reference: await this.nextReference(tx),
              productId: item.productId,
              lotId: line.lotId,
              type: MovementType.ISSUE,
              quantity: new Prisma.Decimal(line.quantity),
              actorEmail: actorEmail ?? null,
              writeOffDestinationId: destination.id,
              writeOffDestination: destination.legacyCode,
              writeOffComment: movementComment,
              operationGroupId: itemGroupId,
              shipmentId,
            },
          });
          references.push(movement.reference);
          itemReferences.push(movement.reference);
        }

        auditItems.push({
          productId: item.productId,
          lines: JSON.parse(JSON.stringify(item.lines)),
          references: itemReferences,
          writeOffDestinationId: destination.id,
          writeOffDestinationLabel: resolveWriteoffDestinationLabel(
            destination,
            destination.legacyCode,
            item.writeOffComment,
          ),
          writeOffComment: item.writeOffComment?.trim() || null,
          operationGroupId: itemGroupId,
          shipmentId,
        });
      }

      const isBatch = auditAction === 'inventory.writeoff.batch';
      const auditMetadata = isBatch
        ? {
            items: auditItems,
            references,
            operationGroupId: sharedGroupId,
            itemCount: items.length,
            lineCount: activeLineCount,
            shipmentId,
          }
        : {
            lines: auditItems[0]?.lines,
            references,
            writeOffDestinationId: auditItems[0]?.writeOffDestinationId,
            writeOffDestinationLabel: auditItems[0]?.writeOffDestinationLabel,
            writeOffComment: auditItems[0]?.writeOffComment,
            operationGroupId: sharedGroupId,
            shipmentId,
          };

      await tx.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action: auditAction,
          entityType: isBatch ? 'writeoff_batch' : 'product',
          entityId: isBatch ? (sharedGroupId ?? references[0] ?? 'batch') : items[0].productId,
          metadata: JSON.parse(JSON.stringify(auditMetadata)),
        },
      });

      return references;
    });
  }

  private async nextReference(tx: Prisma.TransactionClient): Promise<string> {
    // IMPORTANT: must be unique under concurrency.
    // Previous implementation used COUNT()+1 which collides with parallel transactions.
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = crypto.randomUUID().slice(0, 8).toUpperCase();
    return `ПЕР-${ts}-${rnd}`;
  }

  /** Поиск товара для списания: штрихкод, REF, GTIN (EAN), LOT, внутренний код (SKU). */
  private async resolveProductIdByQuery(q: string): Promise<string | undefined> {
    const candidates = normalizeScannedBarcode(q);
    if (candidates.length === 0) return undefined;

    const scan = await this.scanner.process(q);
    if (scan.found && scan.product) return scan.product.id;
    if (scan.found && scan.lot) return scan.lot.productId;

    const fromBarcode = await resolveProductIdFromBarcode(
      (args) => this.prisma.barcodeRecord.findFirst(args),
      q,
    );
    if (fromBarcode) return fromBarcode;

    for (const trimmed of candidates) {
      const bySku = await this.prisma.product.findFirst({
        where: {
          OR: [
            { sku: { equals: trimmed, mode: 'insensitive' } },
            { sku: { equals: trimmed.toUpperCase(), mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (bySku) return bySku.id;

      const byLot = await this.prisma.lot.findFirst({
        where: { lotNumber: { equals: trimmed, mode: 'insensitive' } },
        select: { productId: true },
      });
      if (byLot) return byLot.productId;
    }

    return undefined;
  }
}
