import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';

function formatActorDisplayName(user: {
  displayName: string | null;
  email: string;
}): string {
  const trimmed = user.displayName?.trim();
  if (trimmed) return trimmed;
  const local = user.email.split('@')[0] ?? user.email;
  return local.replace(/[._-]/g, ' ').trim() || user.email;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } },
              { entityId: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const actorIds = [
      ...new Set(items.map((row) => row.actorId).filter((id): id is string => !!id)),
    ];

    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, email: true, displayName: true },
          })
        : [];

    const actorById = new Map(
      actors.map((user) => [
        user.id,
        {
          actorDisplayName: formatActorDisplayName(user),
          actorEmail: user.email,
        },
      ]),
    );

    return {
      items: items.map((row) => {
        const actor = row.actorId ? actorById.get(row.actorId) : undefined;
        return {
          id: row.id,
          actorId: row.actorId,
          actorDisplayName: actor?.actorDisplayName ?? null,
          actorEmail: actor?.actorEmail ?? null,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          metadata: row.metadata,
          createdAt: row.createdAt.toISOString(),
        };
      }),
      total,
      page,
      pageSize,
    };
  }
}
