import { Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { PrismaService } from '../../prisma/prisma.service';
import { MovementsQueryDto } from './dto/movements-query.dto';

export type MovementListItem = {
  id: string;
  date: string;
  type: string;
  productName: string;
  ref: string;
  lot: string | null;
  qty: string;
  user: string;
};

function formatMovementDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const TYPE_LABELS: Record<MovementType, string> = {
  RECEIPT: 'ПРИХОД',
  ISSUE: 'РАСХОД',
  ADJUSTMENT: 'КОРРЕКТИРОВКА',
  QUARANTINE: 'КАРАНТИН',
  UNBLOCK: 'РАЗБЛОКИРОВКА',
  RECALL: 'ОТЗЫВ',
  BLOCK: 'БЛОКИРОВКА',
};

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MovementsQueryDto): Promise<PaginatedResponse<MovementListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();

    const where: Prisma.StockMovementWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(query.operator?.trim()
        ? { actorEmail: { contains: query.operator.trim(), mode: 'insensitive' } }
        : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              { product: { name: { contains: search, mode: 'insensitive' } } },
              { product: { sku: { contains: search, mode: 'insensitive' } } },
              { lot: { lotNumber: { contains: search, mode: 'insensitive' } } },
              { actorEmail: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, movements] = await Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          lot: { select: { lotNumber: true } },
        },
      }),
    ]);

    const items = movements.map((m) => {
      const qtyNum = decimalToNumber(m.quantity);
      const sign =
        m.type === MovementType.RECEIPT || m.type === MovementType.UNBLOCK
          ? '+'
          : m.type === MovementType.ISSUE
            ? '-'
            : qtyNum >= 0
              ? '+'
              : '';
      const absQty = Math.abs(qtyNum);

      return {
        id: m.reference,
        date: formatMovementDate(m.createdAt),
        type: TYPE_LABELS[m.type],
        productName: m.product.name,
        ref: m.product.sku,
        lot: m.lot?.lotNumber ?? null,
        qty: qtyNum === 0 ? '0' : `${sign}${absQty.toLocaleString('ru-RU')}`,
        user: m.actorEmail ?? 'Система',
      };
    });

    return { items, total, page, pageSize };
  }
}
