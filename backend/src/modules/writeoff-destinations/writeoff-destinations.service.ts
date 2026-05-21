import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateWriteoffDestinationDto } from './dto/create-writeoff-destination.dto';
import { UpdateWriteoffDestinationDto } from './dto/update-writeoff-destination.dto';
import { WriteoffDestinationsQueryDto } from './dto/writeoff-destinations-query.dto';

function mapItem(row: {
  id: string;
  name: string;
  type: string | null;
  isActive: boolean;
  legacyCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    isActive: row.isActive,
    legacyCode: row.legacyCode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class WriteoffDestinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(query: WriteoffDestinationsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const skip = (page - 1) * pageSize;
    const search = query.search?.trim();

    const where: Prisma.WriteOffDestinationWhereInput = {
      ...(query.activeOnly ? { isActive: true } : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.writeOffDestination.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.writeOffDestination.count({ where }),
    ]);

    return {
      items: items.map(mapItem),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateWriteoffDestinationDto, actorId: string) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Укажите название назначения');

    const existing = await this.prisma.writeOffDestination.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Назначение с таким названием уже существует');
    }

    const row = await this.prisma.writeOffDestination.create({
      data: {
        name,
        type: dto.type?.trim() || null,
        isActive: true,
      },
    });

    await this.audit.write({
      actorId,
      action: 'writeoff_destination.create',
      entityType: 'writeoff_destination',
      entityId: row.id,
      metadata: { name: row.name },
    });

    return mapItem(row);
  }

  async update(id: string, dto: UpdateWriteoffDestinationDto, actorId: string) {
    const current = await this.prisma.writeOffDestination.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Назначение не найдено');

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Укажите название назначения');
      const dup = await this.prisma.writeOffDestination.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (dup) throw new ConflictException('Назначение с таким названием уже существует');
    }

    const row = await this.prisma.writeOffDestination.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.audit.write({
      actorId,
      action: 'writeoff_destination.update',
      entityType: 'writeoff_destination',
      entityId: row.id,
      metadata: { name: row.name, isActive: row.isActive },
    });

    return mapItem(row);
  }

  async remove(id: string, actorId: string) {
    const current = await this.prisma.writeOffDestination.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Назначение не найдено');

    const usageCount = await this.prisma.stockMovement.count({
      where: { writeOffDestinationId: id },
    });

    if (usageCount > 0) {
      if (!current.isActive) {
        throw new BadRequestException('Назначение уже архивировано');
      }
      const row = await this.prisma.writeOffDestination.update({
        where: { id },
        data: { isActive: false },
      });
      await this.audit.write({
        actorId,
        action: 'writeoff_destination.archive',
        entityType: 'writeoff_destination',
        entityId: row.id,
        metadata: { name: row.name, usageCount },
      });
      return { archived: true, item: mapItem(row) };
    }

    await this.prisma.writeOffDestination.delete({ where: { id } });
    await this.audit.write({
      actorId,
      action: 'writeoff_destination.delete',
      entityType: 'writeoff_destination',
      entityId: id,
      metadata: { name: current.name },
    });
    return { deleted: true };
  }

  async assertActiveDestination(id: string) {
    const dest = await this.prisma.writeOffDestination.findUnique({ where: { id } });
    if (!dest) throw new NotFoundException('Назначение списания не найдено');
    if (!dest.isActive) {
      throw new BadRequestException('Назначение списания неактивно');
    }
    return dest;
  }
}
