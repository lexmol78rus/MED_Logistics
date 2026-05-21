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
import { resolveProductIdFromBarcode } from '../../common/barcode-lookup';
import { normalizeScannedBarcode } from '../../common/barcode-normalize';
import { WriteoffRecommendationQueryDto } from './dto/writeoff-recommendation-query.dto';
import { computeInventoryBalance } from '../../common/utils/inventory-balance.util';
import { resolveWriteoffDestinationLabel } from '../../common/utils/writeoff-destination-label';
import { WriteoffDestinationsService } from '../writeoff-destinations/writeoff-destinations.service';

export type WriteoffLotRecommendation = {
  lotId: string;
  lot: string;
  expiry: string;
  qty: number;
  fefo: boolean;
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
          metadata: { productId, lotNumber, quantity: dto.quantity },
        },
      });

      return { lot, movement };
    });

    return {
      success: true,
      lotId: result.lot.id,
      movementId: result.movement.reference,
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
        const bal = computeInventoryBalance(qty, {
          status: lot.status,
          expiryDate: lot.expiryDate,
        });
        return { lot, qty, available: bal.availableQuantity };
      })
      .filter(({ available }) => available > 0);

    const totalQty = availableLots.reduce((sum, { available }) => sum + available, 0);

    const lots: WriteoffLotRecommendation[] = availableLots.map(({ lot, available }, index) => ({
      lotId: lot.id,
      lot: lot.lotNumber,
      expiry: lot.expiryDate?.toISOString().slice(0, 10) ?? 'Н/Д',
      qty: available,
      fefo: useFefo && index === 0,
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
    const destination = await this.writeoffDestinations.assertActiveDestination(
      dto.writeOffDestinationId,
    );
    this.logger.log(
      `writeoff productId=${dto.productId} destinationId=${destination.id} lines=${dto.lines.length}`,
    );
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Товар не найден');

    const cfg = await this.settings.get();
    const useFefo = dto.useFefoRecommendations !== false;

    if (useFefo && cfg.fefoEnabled) {
      const recommendation = await this.writeoffRecommendation({
        productId: dto.productId,
        useFefoRecommendations: true,
      });
      const fefoLotId = recommendation.lots.find((l) => l.fefo)?.lotId;
      const nonFefoWithQty = dto.lines.filter(
        (line) => line.lotId !== fefoLotId && line.quantity > 0,
      );
      if (nonFefoWithQty.length > 0 && fefoLotId) {
        await this.validation.logFefoViolation(
          dto.productId,
          fefoLotId,
          nonFefoWithQty[0].lotId,
          actorId,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const references: string[] = [];

      for (const line of dto.lines) {
        if (line.quantity <= 0) continue;

        const lot = await tx.lot.findUnique({ where: { id: line.lotId } });
        if (!lot) throw new NotFoundException('Партия не найдена');

        const items = await tx.inventoryItem.findMany({
          where: { productId: dto.productId, lotId: line.lotId },
        });

        const total = items.reduce(
          (sum, item) => sum + decimalToNumber(item.quantity),
          0,
        );
        const bal = computeInventoryBalance(total, {
          status: lot.status,
          expiryDate: lot.expiryDate,
        });

        this.validation.assertWriteoffAllowed(
          lot.status,
          lot.expiryDate,
          line.quantity,
          bal.availableQuantity,
        );

        let remaining = line.quantity;
        for (const item of items) {
          if (remaining <= 0) break;
          const current = decimalToNumber(item.quantity);
          const deduct = Math.min(current, remaining);
          const newQty = current - deduct;
          remaining -= deduct;

          if (newQty <= 0) {
            await tx.inventoryItem.delete({ where: { id: item.id } });
          } else {
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: { quantity: new Prisma.Decimal(newQty) },
            });
          }
        }

        const movement = await tx.stockMovement.create({
          data: {
            reference: await this.nextReference(tx),
            productId: dto.productId,
            lotId: line.lotId,
            type: MovementType.ISSUE,
            quantity: new Prisma.Decimal(line.quantity),
            actorEmail: actorEmail ?? null,
            writeOffDestinationId: destination.id,
            writeOffDestination: destination.legacyCode,
            writeOffComment: dto.writeOffComment?.trim() || null,
          },
        });
        references.push(movement.reference);
      }

      await tx.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action: 'inventory.writeoff',
          entityType: 'product',
          entityId: dto.productId,
          metadata: {
            lines: JSON.parse(JSON.stringify(dto.lines)),
            references,
            writeOffDestinationId: destination.id,
            writeOffDestinationLabel: resolveWriteoffDestinationLabel(
              destination,
              destination.legacyCode,
              dto.writeOffComment,
            ),
            writeOffComment: dto.writeOffComment?.trim() || null,
          },
        },
      });

      return references;
    });

    return { success: true, movementIds: result };
  }

  private async nextReference(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.stockMovement.count();
    return `ПЕР-${String(count + 1).padStart(4, '0')}`;
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
