import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateProductNameDto } from './dto/create-product-name.dto';
import { ProductNamesQueryDto } from './dto/product-names-query.dto';
import { UpdateProductNameDto } from './dto/update-product-name.dto';
import { normalizeProductNameKey } from './product-name-normalize';

export type ProductNameCatalogItem = {
  id: string;
  name: string;
  manufacturer: string | null;
  useCount: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
};

function mapItem(row: {
  id: string;
  name: string;
  manufacturer: string | null;
  useCount: number;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): ProductNameCatalogItem {
  return {
    id: row.id,
    name: row.name,
    manufacturer: row.manufacturer,
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ProductNamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /** Регистрирует наименование при создании/оприходовании товара (идемпотентно). */
  async recordUsage(name: string, manufacturer?: string | null): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;

    const nameNormalized = normalizeProductNameKey(trimmed);
    const mfr = manufacturer?.trim() || null;
    const now = new Date();

    const existing = await this.prisma.productNameCatalog.findUnique({
      where: { nameNormalized },
    });

    if (existing) {
      await this.prisma.productNameCatalog.update({
        where: { id: existing.id },
        data: {
          useCount: { increment: 1 },
          lastUsedAt: now,
          ...(mfr && !existing.manufacturer ? { manufacturer: mfr } : {}),
        },
      });
      return;
    }

    try {
      await this.prisma.productNameCatalog.create({
        data: {
          name: trimmed,
          nameNormalized,
          manufacturer: mfr,
          useCount: 1,
          lastUsedAt: now,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        await this.prisma.productNameCatalog.update({
          where: { nameNormalized },
          data: {
            useCount: { increment: 1 },
            lastUsedAt: now,
            ...(mfr ? { manufacturer: mfr } : {}),
          },
        });
      } else {
        throw err;
      }
    }
  }

  async list(query: ProductNamesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const skip = (page - 1) * pageSize;
    const search = query.search?.trim();

    const where: Prisma.ProductNameCatalogWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { manufacturer: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.productNameCatalog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ lastUsedAt: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.productNameCatalog.count({ where }),
    ]);

    return {
      items: items.map(mapItem),
      total,
      page,
      pageSize,
    };
  }

  async suggest(q: string, limit = 12): Promise<ProductNameCatalogItem[]> {
    const search = q.trim();
    if (!search) return [];

    const take = Math.min(limit, 30);
    const items = await this.prisma.productNameCatalog.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { manufacturer: { contains: search, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: [{ useCount: 'desc' }, { lastUsedAt: 'desc' }],
    });

    return items.map(mapItem);
  }

  async create(dto: CreateProductNameDto, actorId: string) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Укажите наименование');

    const nameNormalized = normalizeProductNameKey(name);
    const existing = await this.prisma.productNameCatalog.findUnique({
      where: { nameNormalized },
    });
    if (existing) {
      throw new ConflictException('Такое наименование уже есть в базе');
    }

    const row = await this.prisma.productNameCatalog.create({
      data: {
        name,
        nameNormalized,
        manufacturer: dto.manufacturer?.trim() || null,
      },
    });

    await this.audit.write({
      actorId,
      action: 'product_name_catalog.create',
      entityType: 'product_name_catalog',
      entityId: row.id,
      metadata: { name: row.name },
    });

    return mapItem(row);
  }

  async update(id: string, dto: UpdateProductNameDto, actorId: string) {
    const current = await this.prisma.productNameCatalog.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Наименование не найдено');

    let name = current.name;
    let nameNormalized = current.nameNormalized;

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) throw new BadRequestException('Укажите наименование');
      const nextKey = normalizeProductNameKey(trimmed);
      if (nextKey !== nameNormalized) {
        const dup = await this.prisma.productNameCatalog.findUnique({
          where: { nameNormalized: nextKey },
        });
        if (dup && dup.id !== id) {
          throw new ConflictException('Такое наименование уже есть в базе');
        }
      }
      name = trimmed;
      nameNormalized = nextKey;
    }

    const row = await this.prisma.productNameCatalog.update({
      where: { id },
      data: {
        name,
        nameNormalized,
        ...(dto.manufacturer !== undefined
          ? { manufacturer: dto.manufacturer?.trim() || null }
          : {}),
      },
    });

    await this.audit.write({
      actorId,
      action: 'product_name_catalog.update',
      entityType: 'product_name_catalog',
      entityId: row.id,
      metadata: { name: row.name },
    });

    return mapItem(row);
  }

  async remove(id: string, actorId: string) {
    const current = await this.prisma.productNameCatalog.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Наименование не найдено');

    await this.prisma.productNameCatalog.delete({ where: { id } });

    await this.audit.write({
      actorId,
      action: 'product_name_catalog.delete',
      entityType: 'product_name_catalog',
      entityId: id,
      metadata: { name: current.name },
    });

    return { deleted: true };
  }
}
