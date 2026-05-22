import { Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { PrismaService } from '../../prisma/prisma.service';
import { MovementsQueryDto } from './dto/movements-query.dto';
import { resolveWriteoffDestinationLabel } from '../../common/utils/writeoff-destination-label';

export type MovementCorrectionMeta = {
  correctedBy: string;
  correctedAt: string;
  reason: string;
  originalReference: string | null;
};

export type MovementListItem = {
  id: string;
  date: string;
  type: string;
  destination: string | null;
  productName: string;
  ref: string;
  lot: string | null;
  expiryDate: string | null;
  qty: string;
  user: string;
  operationGroupId: string | null;
  comment: string | null;
  isCorrection?: boolean;
  hasCorrections?: boolean;
  correctionCount?: number;
  lastCorrection?: MovementCorrectionMeta | null;
  correctionSessionId?: string | null;
  effectiveWriteoffQty?: number | null;
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
      ...(query.writeOffDestinationId
        ? { writeOffDestinationId: query.writeOffDestinationId }
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
          lot: { select: { lotNumber: true, expiryDate: true } },
          destination: { select: { name: true } },
        },
      }),
    ]);

    const movementIds = movements.map((m) => m.id);
    type CorrectionRow = {
      correctedMovementId: string | null;
      actorEmail: string | null;
      createdAt: Date;
      editReason: string | null;
      reference: string;
      type: MovementType;
      quantity: Prisma.Decimal;
    };

    const correctionsByRoot = new Map<string, CorrectionRow[]>();

    if (movementIds.length > 0) {
      const correctionsForRoots = await this.prisma.stockMovement.findMany({
        where: { correctedMovementId: { in: movementIds } },
        orderBy: { createdAt: 'desc' },
        select: {
          correctedMovementId: true,
          actorEmail: true,
          createdAt: true,
          editReason: true,
          reference: true,
          type: true,
          quantity: true,
        },
      });

      for (const c of correctionsForRoots) {
        const rootId = c.correctedMovementId!;
        if (!correctionsByRoot.has(rootId)) correctionsByRoot.set(rootId, []);
        correctionsByRoot.get(rootId)!.push(c);
      }
    }

    const items = movements.map((m) => {
      const qtyNum = decimalToNumber(m.quantity);
      const isCorrection = !!m.correctedMovementId;
      const sign =
        isCorrection && m.type === MovementType.ADJUSTMENT
          ? '+'
          : m.type === MovementType.RECEIPT || m.type === MovementType.UNBLOCK
            ? '+'
            : m.type === MovementType.ISSUE
              ? '-'
              : qtyNum >= 0
                ? '+'
                : '';
      const absQty = Math.abs(qtyNum);

      const destinationLabel =
        m.type === MovementType.ISSUE || (isCorrection && m.writeOffDestinationId)
          ? resolveWriteoffDestinationLabel(
              m.destination,
              m.writeOffDestination,
              m.writeOffComment,
            )
          : null;

      let typeLabel = TYPE_LABELS[m.type];
      if (isCorrection) {
        typeLabel =
          m.type === MovementType.ADJUSTMENT
            ? 'Корректировка списания (возврат)'
            : 'Корректировка списания (доп.)';
      } else if (m.type === MovementType.ISSUE && destinationLabel) {
        typeLabel = `Списано → ${destinationLabel}`;
      }

      const rootCorrections = correctionsByRoot.get(m.id) ?? [];
      let effectiveWriteoffQty: number | null = null;
      if (m.type === MovementType.ISSUE && !m.correctedMovementId) {
        let issued = qtyNum;
        for (const c of rootCorrections) {
          const cq = decimalToNumber(c.quantity);
          if (c.type === MovementType.ISSUE) issued += cq;
          else if (c.type === MovementType.ADJUSTMENT) issued -= cq;
        }
        effectiveWriteoffQty = Math.max(0, issued);
      }
      const lastCorrectionRow = rootCorrections[0];
      const lastCorrection: MovementCorrectionMeta | null = lastCorrectionRow
        ? {
            correctedBy: lastCorrectionRow.actorEmail ?? 'Система',
            correctedAt: formatMovementDate(lastCorrectionRow.createdAt),
            reason: lastCorrectionRow.editReason?.trim() || '—',
            originalReference: m.reference,
          }
        : null;

      return {
        id: m.reference,
        date: formatMovementDate(m.createdAt),
        type: typeLabel,
        destination: destinationLabel,
        productName: m.product.name,
        ref: m.product.sku,
        lot: m.lot?.lotNumber ?? null,
        expiryDate: m.lot?.expiryDate?.toISOString().slice(0, 10) ?? null,
        qty: qtyNum === 0 ? '0' : `${sign}${absQty.toLocaleString('ru-RU')}`,
        user: m.actorEmail ?? 'Система',
        operationGroupId: m.operationGroupId,
        comment: m.writeOffComment,
        isCorrection,
        hasCorrections: rootCorrections.length > 0,
        correctionCount: rootCorrections.length,
        lastCorrection,
        correctionSessionId: m.correctionSessionId,
        effectiveWriteoffQty,
        editReason: m.editReason?.trim() || null,
      };
    });

    return { items, total, page, pageSize };
  }
}
