import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LotStatus, MovementType, Prisma } from '@prisma/client';
import { ProductsQueryDto } from './dto/products-query.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { decimalToNumber } from '../../common/utils/decimal.util';
import {
  computeLotUiStatus,
  computeProductStatus,
  formatNearestExpiry,
  resolveNearestAvailableExpiry,
  resolvePrimaryLotNumber,
  sortLotsFefo,
  type ProductLotContext,
} from '../../common/utils/inventory-status.util';
import { resolveProductIdFromBarcode } from '../../common/barcode-lookup';
import { normalizeGtin } from '../../common/gtin-normalize';
import { resolveExpiryThresholds } from '../../common/utils/expiry-thresholds.util';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryBalanceService } from '../inventory/inventory-balance.service';
import { ExpectedReceiptsService } from '../expected-receipts/expected-receipts.service';
import { SettingsService } from '../settings/settings.service';
import {
  ShipmentAssemblyReservationService,
  type ShipmentAssemblyHold,
} from '../shipments/shipment-assembly-reservation.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QuickCreateProductDto } from './dto/quick-create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PurgeAllProductsDto } from './dto/purge-all-products.dto';
import { ProductNamesService } from '../product-names/product-names.service';

export type ProductLotSummary = {
  lot: string;
  qty: number;
  expiryDate: string | null;
  status: string;
  location: string | null;
};

export type ProductListItem = {
  id: string;
  status: string;
  name: string;
  ref: string;
  lot: string | null;
  manufacturer: string | null;
  qty: number;
  availableQty: number;
  lots: number;
  lotItems: ProductLotSummary[];
  nearestExpiry: string;
  barcode: string | null;
  gtin: string | null;
  location: string | null;
  minStock: number | null;
  reorderPoint: number | null;
  lowStock: boolean;
  assemblyReservedQty: number;
  assemblyHolds: ShipmentAssemblyHold[];
};

export type ProductDetail = ProductListItem & {
  category: string | null;
  storageCond: string | null;
};

export type QuickCreateProductResult = ProductDetail & {
  created: boolean;
};

export type DeleteProductResult = {
  deleted: true;
  productId: string;
  sku: string;
  name: string;
  counts: {
    lots: number;
    inventoryRows: number;
    movements: number;
    expectedReceipts: number;
    registrationCertificates: number;
    barcodeRecords: number;
  };
  forced: boolean;
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: InventoryBalanceService,
    private readonly expectedReceipts: ExpectedReceiptsService,
    private readonly settings: SettingsService,
    private readonly assemblyReservations: ShipmentAssemblyReservationService,
    private readonly productNames: ProductNamesService,
  ) {}

  private async getExpiryThresholds() {
    const cfg = await this.settings.get();
    return resolveExpiryThresholds({
      warningDays: cfg.expiryWarningDays,
      criticalDays: cfg.expiryCriticalDays,
    });
  }

  async list(query: ProductsQueryDto): Promise<PaginatedResponse<ProductListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();
    const manufacturer = query.manufacturer?.trim();

    const where: Prisma.ProductWhereInput = {
      ...(manufacturer
        ? { manufacturer: { contains: manufacturer, mode: 'insensitive' } }
        : {}),
      ...(query.hasExpiry === true
        ? { lots: { some: { expiryDate: { not: null } } } }
        : query.hasExpiry === false
          ? { lots: { every: { expiryDate: null } } }
          : {}),
      ...(search
        ? {
            OR: [
              { sku: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { manufacturer: { contains: search, mode: 'insensitive' } },
              ...(normalizeGtin(search) ? [{ gtin: normalizeGtin(search)! }] : []),
              { barcodes: { some: { barcode: { contains: search, mode: 'insensitive' } } } },
              { lots: { some: { lotNumber: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        barcodes: { take: 1, orderBy: { createdAt: 'asc' } },
        lots: {
          select: {
            id: true,
            lotNumber: true,
            expiryDate: true,
            status: true,
            inventoryRows: {
              where: { quantity: { gt: 0 } },
              select: { quantity: true, reservedQuantity: true, location: true },
            },
          },
        },
        inventoryRows: { select: { quantity: true } },
      },
    });

    const thresholds = await this.getExpiryThresholds();
    const holdsByProduct = await this.assemblyReservations.getHoldsByProductIds(
      products.map((p) => p.id),
    );
    let items = await Promise.all(
      products.map((p) => this.toListItem(p, thresholds, holdsByProduct.get(p.id) ?? [])),
    );

    if (query.lowStock === true) {
      items = items.filter((i) => i.lowStock);
    }
    if (query.status?.trim()) {
      const status = query.status.trim();
      items = items.filter((i) => i.status === status);
    }

    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total, page, pageSize };
  }

  async getById(id: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        barcodes: { take: 1, orderBy: { createdAt: 'asc' } },
        lots: {
          select: {
            id: true,
            lotNumber: true,
            expiryDate: true,
            status: true,
            inventoryRows: {
              where: { quantity: { gt: 0 } },
              select: { quantity: true, reservedQuantity: true, location: true },
            },
          },
        },
        inventoryRows: { select: { quantity: true } },
      },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    const thresholds = await this.getExpiryThresholds();
    const holds = await this.assemblyReservations.getHoldsByProductIds([id]);
    const item = await this.toListItem(product, thresholds, holds.get(id) ?? []);
    return { ...item, category: null, storageCond: null };
  }

  async create(dto: CreateProductDto): Promise<ProductDetail> {
    const sku = dto.sku.trim().toUpperCase();
    this.logger.log(`create product sku=${sku}`);
    const existing = await this.prisma.product.findUnique({ where: { sku } });
    if (existing) throw new ConflictException('Артикул уже существует');

    if (dto.barcode) {
      const barcodeTaken = await this.prisma.barcodeRecord.findUnique({
        where: { barcode: dto.barcode.trim() },
      });
      if (barcodeTaken) throw new ConflictException('Штрихкод уже используется');
    }

    const gtin = normalizeGtin(dto.gtin);
    if (gtin) {
      const gtinTaken = await this.prisma.product.findUnique({ where: { gtin } });
      if (gtinTaken) throw new ConflictException('GTIN уже используется другим товаром');
    }

    const product = await this.prisma.product.create({
      data: {
        sku,
        name: dto.name.trim(),
        manufacturer: dto.manufacturer?.trim() || null,
        gtin,
        barcodes: dto.barcode
          ? { create: { barcode: dto.barcode.trim() } }
          : undefined,
      },
      include: {
        barcodes: { take: 1, orderBy: { createdAt: 'asc' } },
        lots: {
          select: {
            id: true,
            lotNumber: true,
            expiryDate: true,
            status: true,
            inventoryRows: {
              where: { quantity: { gt: 0 } },
              select: { quantity: true, reservedQuantity: true, location: true },
            },
          },
        },
        inventoryRows: { select: { quantity: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'product.create',
        entityType: 'product',
        entityId: product.id,
        metadata: { sku: product.sku, name: product.name },
      },
    });

    await this.productNames.recordUsage(product.name, product.manufacturer);

    const created = await this.toListItem(product);
    return { ...created, category: null, storageCond: null };
  }

  async quickCreate(dto: QuickCreateProductDto): Promise<QuickCreateProductResult> {
    const barcode = dto.barcode.trim();
    const name = dto.name.trim();

    // REF — главный идентификатор: один товар, много штрихкодов и партий LOT.
    const gtin = normalizeGtin(dto.gtin);

    const existingByRef = await this.findProductByRefForQuickCreate(dto.sku);
    if (existingByRef) {
      await this.linkBarcodeToProduct(barcode, existingByRef.id, { allowReassign: true });
      await this.applyGtinIfEmpty(existingByRef.id, gtin);
      this.logger.log(
        `quick-create reuse by ref sku=${existingByRef.sku} barcode=${barcode}`,
      );
      const refreshed = await this.prisma.product.findUnique({
        where: { id: existingByRef.id },
        include: this.productQuickCreateInclude(),
      });
      const item = await this.toListItem(refreshed ?? existingByRef);
      return { ...item, category: null, storageCond: null, created: false };
    }

    if (gtin) {
      const existingByGtin = await this.prisma.product.findUnique({
        where: { gtin },
        include: this.productQuickCreateInclude(),
      });
      if (existingByGtin) {
        await this.linkBarcodeToProduct(barcode, existingByGtin.id, { allowReassign: true });
        const item = await this.toListItem(existingByGtin);
        return { ...item, category: null, storageCond: null, created: false };
      }
    }

    const productIdFromBarcode = await resolveProductIdFromBarcode(
      (args) => this.prisma.barcodeRecord.findFirst(args),
      barcode,
    );
    if (productIdFromBarcode) {
      const product = await this.prisma.product.findUnique({
        where: { id: productIdFromBarcode },
        include: this.productQuickCreateInclude(),
      });
      if (product) {
        await this.applyGtinIfEmpty(product.id, gtin);
        const refreshed = await this.prisma.product.findUnique({
          where: { id: product.id },
          include: this.productQuickCreateInclude(),
        });
        const item = await this.toListItem(refreshed ?? product);
        return { ...item, category: null, storageCond: null, created: false };
      }
    }

    const sku = await this.resolveQuickCreateSku(dto.sku, barcode);
    this.logger.log(`quick-create product sku=${sku} barcode=${barcode}`);

    const include = this.productQuickCreateInclude();

    // Concurrency-safe quick-create:
    // - Two users may quick-create same REF/barcode in parallel.
    // - DB unique constraints decide the winner; we then reuse the created product.
    try {
      if (gtin) {
        const gtinTaken = await this.prisma.product.findUnique({ where: { gtin } });
        if (gtinTaken) throw new ConflictException('GTIN уже используется другим товаром');
      }

      const product = await this.prisma.product.create({
        data: {
          sku,
          name,
          manufacturer: dto.manufacturer?.trim() || null,
          gtin,
          // Avoid nested create race on barcode unique: link separately (upsert).
        },
        include,
      });

      await this.prisma.barcodeRecord.upsert({
        where: { barcode },
        create: { barcode, productId: product.id },
        update: { productId: product.id, lotId: null },
      });

      await this.prisma.auditLog.create({
        data: {
          action: 'product.quick_create',
          entityType: 'product',
          entityId: product.id,
          metadata: { sku: product.sku, name: product.name, barcode },
        },
      });

      await this.productNames.recordUsage(product.name, product.manufacturer);

      const created = await this.toListItem(product);
      return { ...created, category: null, storageCond: null, created: true };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Someone created it just now (by sku or barcode). Re-fetch and proceed idempotently.
        const existingBySku = await this.prisma.product.findUnique({ where: { sku }, include });
        const existing =
          existingBySku ??
          (await this.prisma.barcodeRecord
            .findUnique({ where: { barcode }, select: { productId: true } })
            .then((row) =>
              row?.productId
                ? this.prisma.product.findUnique({ where: { id: row.productId }, include })
                : null,
            ));

        if (existing) {
          await this.prisma.barcodeRecord.upsert({
            where: { barcode },
            create: { barcode, productId: existing.id },
            update: { productId: existing.id, lotId: null },
          });
          await this.applyGtinIfEmpty(existing.id, gtin);
          const refreshed = await this.prisma.product.findUnique({
            where: { id: existing.id },
            include,
          });
          const item = await this.toListItem(refreshed ?? existing);
          return { ...item, category: null, storageCond: null, created: false };
        }
      }
      throw err;
    }
  }

  /**
   * Debug-only cleanup: delete product and all dependent data.
   *
   * - Product relations mostly onDelete: Cascade.
   * - Barcode records are onDelete: SetNull, so we delete them explicitly to avoid future barcode conflicts.
   */
  async deleteProduct(id: string, actorEmail?: string, force = false): Promise<DeleteProductResult> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        lots: { select: { id: true } },
        inventoryRows: { select: { id: true, quantity: true, reservedQuantity: true } },
        movements: { select: { id: true } },
        expectedReceipts: { select: { id: true } },
        registrationCertificates: { select: { id: true } },
        barcodes: { select: { id: true } },
      },
    });
    if (!product) throw new NotFoundException('Товар не найден');

    const totalQty = product.inventoryRows.reduce((sum, row) => sum + decimalToNumber(row.quantity), 0);
    const reservedQty = product.inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.reservedQuantity ?? 0),
      0,
    );

    // Safety rail: avoid accidental deletion of non-empty / historical items unless forced.
    if (!force) {
      if (totalQty > 0 || reservedQty > 0) {
        throw new ConflictException(
          'Нельзя удалить товар: есть остаток/резерв. Используйте параметр force=1 (админский debug).',
        );
      }
      if (product.movements.length > 0) {
        throw new ConflictException(
          'Нельзя удалить товар: есть движения по складу. Используйте параметр force=1 (админский debug).',
        );
      }
      if (product.expectedReceipts.length > 0) {
        throw new ConflictException(
          'Нельзя удалить товар: есть ожидаемые поступления. Используйте параметр force=1 (админский debug).',
        );
      }
    }

    const lotIds = product.lots.map((l) => l.id);
    const barcodeWhere: Prisma.BarcodeRecordWhereInput = lotIds.length
      ? { OR: [{ productId: id }, { lotId: { in: lotIds } }] }
      : { productId: id };

    const counts = {
      lots: product.lots.length,
      inventoryRows: product.inventoryRows.length,
      movements: product.movements.length,
      expectedReceipts: product.expectedReceipts.length,
      registrationCertificates: product.registrationCertificates.length,
      barcodeRecords: product.barcodes.length,
    };

    this.logger.warn(
      `delete product id=${id} sku=${product.sku} force=${force} by=${actorEmail ?? 'unknown'}`,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.barcodeRecord.deleteMany({ where: barcodeWhere });
      await tx.product.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          action: 'product.delete',
          entityType: 'product',
          entityId: id,
          metadata: {
            actorEmail: actorEmail ?? null,
            sku: product.sku,
            name: product.name,
            forced: force,
            counts,
            qty: { total: totalQty, reserved: reservedQty },
          },
        },
      });
    });

    return {
      deleted: true,
      productId: id,
      sku: product.sku,
      name: product.name,
      counts,
      forced: force,
    };
  }

  private productQuickCreateInclude() {
    return {
      barcodes: { take: 1, orderBy: { createdAt: 'asc' as const } },
      lots: {
        select: {
          id: true,
          lotNumber: true,
          expiryDate: true,
          status: true,
          inventoryRows: {
            where: { quantity: { gt: 0 } },
            select: { quantity: true, reservedQuantity: true, location: true },
          },
        },
      },
      inventoryRows: { select: { quantity: true } },
    };
  }

  private async findProductByRefForQuickCreate(skuInput: string | undefined) {
    const trimmed = skuInput?.trim();
    if (!trimmed) return null;

    const sku = trimmed.toUpperCase();
    return this.prisma.product.findFirst({
      where: {
        OR: [
          { sku: { equals: sku, mode: 'insensitive' } },
          { sku: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      include: this.productQuickCreateInclude(),
    });
  }

  private async linkBarcodeToProduct(
    barcode: string,
    productId: string,
    options?: { allowReassign?: boolean },
  ): Promise<void> {
    const productIdFromBarcode = await resolveProductIdFromBarcode(
      (args) => this.prisma.barcodeRecord.findFirst(args),
      barcode,
    );

    if (!productIdFromBarcode) {
      // Concurrency-safe: two users may link same barcode simultaneously.
      await this.prisma.barcodeRecord.upsert({
        where: { barcode: barcode.trim() },
        create: { barcode: barcode.trim(), productId },
        update: options?.allowReassign ? { productId, lotId: null } : {},
      });
      return;
    }

    if (productIdFromBarcode === productId) {
      return;
    }

    if (options?.allowReassign) {
      const record = await this.prisma.barcodeRecord.findFirst({
        where: { OR: [{ barcode }, { barcode: { equals: barcode, mode: 'insensitive' } }] },
        select: { id: true, barcode: true },
      });
      if (record) {
        await this.prisma.barcodeRecord.update({
          where: { id: record.id },
          data: { productId, lotId: null },
        });
      }
      return;
    }

    throw new ConflictException('Штрихкод уже используется');
  }

  private async applyGtinIfEmpty(productId: string, gtinInput?: string | null): Promise<void> {
    const gtin = normalizeGtin(gtinInput);
    if (!gtin) return;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { gtin: true },
    });
    if (!product || product.gtin) return;

    const taken = await this.prisma.product.findFirst({
      where: { gtin, NOT: { id: productId } },
    });
    if (taken) return;

    await this.prisma.product.update({
      where: { id: productId },
      data: { gtin },
    });
  }

  private async resolveQuickCreateSku(skuInput: string | undefined, barcode: string): Promise<string> {
    if (skuInput?.trim()) {
      const sku = skuInput.trim().toUpperCase();
      const existing = await this.prisma.product.findUnique({ where: { sku } });
      if (existing) throw new ConflictException('Артикул уже существует');
      return sku;
    }

    const base = `BC-${barcode.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`.slice(0, 56);
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.product.findUnique({ where: { sku: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async update(id: string, dto: UpdateProductDto, actorEmail?: string): Promise<ProductDetail> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Товар не найден');

    let newSku: string | undefined;
    if (dto.sku?.trim()) {
      newSku = dto.sku.trim().toUpperCase();
      if (newSku !== existing.sku) {
        const skuTaken = await this.prisma.product.findUnique({ where: { sku: newSku } });
        if (skuTaken) throw new ConflictException('Артикул уже существует');
      } else {
        newSku = undefined;
      }
    }

    if (dto.barcode?.trim()) {
      const barcodeTaken = await this.prisma.barcodeRecord.findFirst({
        where: { barcode: dto.barcode.trim(), NOT: { productId: id } },
      });
      if (barcodeTaken) throw new ConflictException('Штрихкод уже используется');
    }

    let newGtin: string | null | undefined;
    if (dto.gtin !== undefined) {
      newGtin = normalizeGtin(dto.gtin);
      if (dto.gtin.trim() && !newGtin) {
        throw new BadRequestException('Некорректный GTIN (ожидается 8–14 цифр)');
      }
      if (newGtin) {
        const gtinTaken = await this.prisma.product.findFirst({
          where: { gtin: newGtin, NOT: { id } },
        });
        if (gtinTaken) throw new ConflictException('GTIN уже используется другим товаром');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          sku: newSku,
          name: dto.name?.trim(),
          gtin: newGtin !== undefined ? newGtin : undefined,
          manufacturer:
            dto.manufacturer !== undefined ? dto.manufacturer?.trim() || null : undefined,
          minStock:
            dto.minStock !== undefined ? new Prisma.Decimal(dto.minStock) : undefined,
          reorderPoint:
            dto.reorderPoint !== undefined
              ? new Prisma.Decimal(dto.reorderPoint)
              : undefined,
        },
      });

      if (dto.barcode !== undefined) {
        const barcode = dto.barcode.trim();
        await tx.barcodeRecord.deleteMany({ where: { productId: id } });
        if (barcode) {
          await tx.barcodeRecord.create({
            data: { barcode, productId: id },
          });
        }
      }

      await tx.stockMovement.create({
        data: {
          // Must be unique under concurrency.
          reference: `ПЕР-${Date.now().toString(36).toUpperCase()}-${crypto
            .randomUUID()
            .slice(0, 8)
            .toUpperCase()}`,
          productId: id,
          type: MovementType.ADJUSTMENT,
          quantity: 0,
          actorEmail: actorEmail ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'product.update',
          entityType: 'product',
          entityId: id,
          metadata: {
            sku: existing.sku,
            ...(newSku ? { newSku } : {}),
            changes: JSON.parse(JSON.stringify(dto)),
          },
        },
      });
    });

    if (dto.name?.trim()) {
      const mfr =
        dto.manufacturer !== undefined
          ? dto.manufacturer?.trim() || null
          : existing.manufacturer;
      await this.productNames.recordUsage(dto.name.trim(), mfr);
    }

    return this.getById(id);
  }

  async purgeAllProducts(dto: PurgeAllProductsDto, actorEmail?: string) {
    const phrase = (dto.confirm ?? '').trim();
    const expected = 'DELETE_ALL_PRODUCTS';
    if (phrase !== expected) {
      throw new ConflictException(
        `Неверное подтверждение. Для выполнения передайте confirm="${expected}"`,
      );
    }

    const counts = {
      products: await this.prisma.product.count(),
      lots: await this.prisma.lot.count(),
      inventoryItems: await this.prisma.inventoryItem.count(),
      movements: await this.prisma.stockMovement.count(),
      expectedReceipts: await this.prisma.expectedReceipt.count(),
      expectedReceiptEvents: await this.prisma.expectedReceiptEvent.count(),
      registrationCertificates: await this.prisma.productRegistrationCertificate.count(),
      barcodeRecords: await this.prisma.barcodeRecord.count(),
    };

    if (dto.dryRun === true) {
      return { dryRun: true, counts };
    }

    this.logger.warn(
      `PURGE ALL PRODUCTS initiated by ${actorEmail ?? 'unknown'} counts=${JSON.stringify(counts)}`,
    );

    const deleted = await this.prisma.$transaction(async (tx) => {
      // Products relations are mostly onDelete: Cascade, but barcode records are onDelete: SetNull.
      // We delete barcode records explicitly to avoid future barcode conflicts.
      const barcodeDel = await tx.barcodeRecord.deleteMany({});
      const productDel = await tx.product.deleteMany({});

      await tx.auditLog.create({
        data: {
          action: 'product.purge_all',
          entityType: 'product',
          entityId: null,
          metadata: {
            actorEmail: actorEmail ?? null,
            deleted: {
              products: productDel.count,
              barcodeRecords: barcodeDel.count,
            },
            before: counts,
          },
        },
      });

      return {
        products: productDel.count,
        barcodeRecords: barcodeDel.count,
      };
    });

    return {
      dryRun: false,
      before: counts,
      deleted,
    };
  }

  private resolveWarehouseLocation(
    rows: { location: string | null }[],
  ): string | null {
    const unique = [
      ...new Set(
        rows
          .map((row) => row.location?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    if (unique.length === 0) return null;
    if (unique.length === 1) return unique[0];
    return unique.join(', ');
  }

  private async toListItem(
    product: {
      id: string;
      sku: string;
      gtin: string | null;
      name: string;
      manufacturer: string | null;
      minStock: Prisma.Decimal | null;
      reorderPoint: Prisma.Decimal | null;
      barcodes: { barcode: string }[];
      lots: {
        lotNumber: string;
        expiryDate: Date | null;
        status: LotStatus;
        inventoryRows: {
          quantity: Prisma.Decimal;
          reservedQuantity: Prisma.Decimal | null;
          location: string | null;
        }[];
      }[];
      inventoryRows: { quantity: Prisma.Decimal }[];
    },
    thresholds = resolveExpiryThresholds(),
    assemblyHolds: ShipmentAssemblyHold[] = [],
  ): Promise<ProductListItem> {
    const qty = product.inventoryRows.reduce(
      (sum, row) => sum + decimalToNumber(row.quantity),
      0,
    );
    const bal = await this.balance.getProductBalance(product.id);
    const lotContexts: ProductLotContext[] = product.lots.map((l) => ({
      lotNumber: l.lotNumber,
      expiryDate: l.expiryDate,
      status: l.status,
      totalQty: l.inventoryRows.reduce(
        (sum, row) => sum + decimalToNumber(row.quantity),
        0,
      ),
      reservedQty: l.inventoryRows.reduce(
        (sum, row) => sum + decimalToNumber(row.reservedQuantity ?? 0),
        0,
      ),
    }));
    const sortedLots = sortLotsFefo(lotContexts);
    const nearestExpiry = resolveNearestAvailableExpiry(lotContexts);
    const primaryLot = resolvePrimaryLotNumber(lotContexts);
    const lotByNumber = new Map(product.lots.map((l) => [l.lotNumber, l]));
    const lotItems: ProductLotSummary[] = sortedLots.map((ctx) => {
      const source = lotByNumber.get(ctx.lotNumber);
      return {
        lot: ctx.lotNumber,
        qty: ctx.totalQty,
        expiryDate: ctx.expiryDate?.toISOString().slice(0, 10) ?? null,
        status: computeLotUiStatus(ctx.status, ctx.expiryDate, ctx.totalQty, thresholds),
        location: source
          ? this.resolveWarehouseLocation(source.inventoryRows)
          : null,
      };
    });
    const location = this.resolveWarehouseLocation(
      product.lots.flatMap((lot) => lot.inventoryRows),
    );
    const minStock = product.minStock != null ? decimalToNumber(product.minStock) : null;
    const reorderPoint =
      product.reorderPoint != null ? decimalToNumber(product.reorderPoint) : null;
    const threshold = reorderPoint ?? minStock;
    const lowStock =
      threshold != null &&
      bal.availableQuantity > 0 &&
      bal.availableQuantity <= threshold;

    const assemblyReservedQty = assemblyHolds.reduce((sum, hold) => sum + hold.quantity, 0);

    return {
      id: product.id,
      status: computeProductStatus(bal.availableQuantity, nearestExpiry, thresholds),
      name: product.name,
      ref: product.sku,
      gtin: product.gtin,
      lot: primaryLot,
      manufacturer: product.manufacturer,
      qty,
      availableQty: bal.availableQuantity,
      lots: product.lots.length,
      lotItems,
      nearestExpiry: formatNearestExpiry(nearestExpiry),
      barcode: product.barcodes[0]?.barcode ?? null,
      location,
      minStock,
      reorderPoint,
      lowStock,
      assemblyReservedQty,
      assemblyHolds,
    };
  }
}
