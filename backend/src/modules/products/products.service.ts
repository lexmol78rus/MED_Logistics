import {
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
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryBalanceService } from '../inventory/inventory-balance.service';
import { ExpectedReceiptsService } from '../expected-receipts/expected-receipts.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QuickCreateProductDto } from './dto/quick-create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
  location: string | null;
  minStock: number | null;
  reorderPoint: number | null;
  lowStock: boolean;
};

export type ProductDetail = ProductListItem & {
  category: string | null;
  storageCond: string | null;
};

export type QuickCreateProductResult = ProductDetail & {
  created: boolean;
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: InventoryBalanceService,
    private readonly expectedReceipts: ExpectedReceiptsService,
  ) {}

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

    let items = await Promise.all(products.map((p) => this.toListItem(p)));

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
    const item = await this.toListItem(product);
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

    const product = await this.prisma.product.create({
      data: {
        sku,
        name: dto.name.trim(),
        manufacturer: dto.manufacturer?.trim() || null,
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

    const created = await this.toListItem(product);
    return { ...created, category: null, storageCond: null };
  }

  async quickCreate(dto: QuickCreateProductDto): Promise<QuickCreateProductResult> {
    const barcode = dto.barcode.trim();
    const name = dto.name.trim();

    // REF — главный идентификатор: один товар, много штрихкодов и партий LOT.
    const existingByRef = await this.findProductByRefForQuickCreate(dto.sku);
    if (existingByRef) {
      await this.linkBarcodeToProduct(barcode, existingByRef.id, { allowReassign: true });
      this.logger.log(
        `quick-create reuse by ref sku=${existingByRef.sku} barcode=${barcode}`,
      );
      const item = await this.toListItem(existingByRef);
      return { ...item, category: null, storageCond: null, created: false };
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
        const item = await this.toListItem(product);
        return { ...item, category: null, storageCond: null, created: false };
      }
    }

    const sku = await this.resolveQuickCreateSku(dto.sku, barcode);
    this.logger.log(`quick-create product sku=${sku} barcode=${barcode}`);

    const product = await this.prisma.product.create({
      data: {
        sku,
        name,
        manufacturer: dto.manufacturer?.trim() || null,
        barcodes: { create: { barcode } },
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
        action: 'product.quick_create',
        entityType: 'product',
        entityId: product.id,
        metadata: { sku: product.sku, name: product.name, barcode },
      },
    });

    const created = await this.toListItem(product);
    return { ...created, category: null, storageCond: null, created: true };
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
      await this.prisma.barcodeRecord.create({ data: { barcode: barcode.trim(), productId } });
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

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          sku: newSku,
          name: dto.name?.trim(),
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

      const count = await tx.stockMovement.count();
      await tx.stockMovement.create({
        data: {
          reference: `ПЕР-${String(count + 1).padStart(4, '0')}`,
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

    return this.getById(id);
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
        status: computeLotUiStatus(ctx.status, ctx.expiryDate, ctx.totalQty),
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

    return {
      id: product.id,
      status: computeProductStatus(bal.availableQuantity, nearestExpiry),
      name: product.name,
      ref: product.sku,
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
    };
  }
}
