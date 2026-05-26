import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExpectedReceiptEventType,
  ExpectedReceiptStatus,
  Prisma,
} from '@prisma/client';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateExpectedReceiptDto } from './dto/create-expected-receipt.dto';
import { ExpectedReceiptsQueryDto } from './dto/expected-receipts-query.dto';
import { UpdateExpectedReceiptDto } from './dto/update-expected-receipt.dto';

const ACTIVE_STATUSES: ExpectedReceiptStatus[] = [
  ExpectedReceiptStatus.ORDERED,
  ExpectedReceiptStatus.PARTIALLY_RECEIVED,
];

const STATUS_LABELS: Record<ExpectedReceiptStatus, string> = {
  ORDERED: 'Заказано',
  PARTIALLY_RECEIVED: 'Частично оприходовано',
  RECEIVED: 'Оприходовано',
  CANCELLED: 'Отменено',
};

export type ExpectedReceiptEventDto = {
  id: string;
  type: ExpectedReceiptEventType;
  typeLabel: string;
  quantity: number | null;
  message: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export type ExpectedReceiptDto = {
  id: string;
  productId: string;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  status: ExpectedReceiptStatus;
  statusLabel: string;
  comment: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  events: ExpectedReceiptEventDto[];
};

function remainingQty(ordered: Prisma.Decimal, received: Prisma.Decimal): number {
  return Math.max(0, decimalToNumber(ordered) - decimalToNumber(received));
}

function resolveStatus(
  ordered: Prisma.Decimal,
  received: Prisma.Decimal,
  current: ExpectedReceiptStatus,
): ExpectedReceiptStatus {
  if (current === ExpectedReceiptStatus.CANCELLED) return current;
  const orderedN = decimalToNumber(ordered);
  const receivedN = decimalToNumber(received);
  if (receivedN <= 0) return ExpectedReceiptStatus.ORDERED;
  if (receivedN >= orderedN) return ExpectedReceiptStatus.RECEIVED;
  return ExpectedReceiptStatus.PARTIALLY_RECEIVED;
}

function eventTypeLabel(type: ExpectedReceiptEventType): string {
  switch (type) {
    case ExpectedReceiptEventType.CREATED:
      return 'Создано ожидание';
    case ExpectedReceiptEventType.RECEIVED:
      return 'Оприходовано';
    case ExpectedReceiptEventType.UPDATED:
      return 'Изменено';
    case ExpectedReceiptEventType.CANCELLED:
      return 'Отменено';
    case ExpectedReceiptEventType.CLOSED:
      return 'Закрыто';
    default:
      return type;
  }
}

function mapEvent(row: {
  id: string;
  type: ExpectedReceiptEventType;
  quantity: Prisma.Decimal | null;
  message: string | null;
  actorEmail: string | null;
  createdAt: Date;
}): ExpectedReceiptEventDto {
  return {
    id: row.id,
    type: row.type,
    typeLabel: eventTypeLabel(row.type),
    quantity: row.quantity != null ? decimalToNumber(row.quantity) : null,
    message: row.message,
    actorEmail: row.actorEmail,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapReceipt(
  row: {
    id: string;
    productId: string;
    orderedQty: Prisma.Decimal;
    receivedQty: Prisma.Decimal;
    status: ExpectedReceiptStatus;
    comment: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    events: {
      id: string;
      type: ExpectedReceiptEventType;
      quantity: Prisma.Decimal | null;
      message: string | null;
      actorEmail: string | null;
      createdAt: Date;
    }[];
  },
): ExpectedReceiptDto {
  return {
    id: row.id,
    productId: row.productId,
    orderedQty: decimalToNumber(row.orderedQty),
    receivedQty: decimalToNumber(row.receivedQty),
    remainingQty: remainingQty(row.orderedQty, row.receivedQty),
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    comment: row.comment,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    events: row.events.map(mapEvent),
  };
}

@Injectable()
export class ExpectedReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(query: ExpectedReceiptsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ExpectedReceiptWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.activeOnly ? { status: { in: ACTIVE_STATUSES } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.expectedReceipt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          events: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.expectedReceipt.count({ where }),
    ]);

    return {
      items: rows.map(mapReceipt),
      total,
      page,
      pageSize,
    };
  }

  async listActiveForProduct(productId: string) {
    const rows = await this.prisma.expectedReceipt.findMany({
      where: { productId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'asc' },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    return rows.map(mapReceipt);
  }

  async hasActiveForProduct(productId: string): Promise<boolean> {
    const count = await this.prisma.expectedReceipt.count({
      where: { productId, status: { in: ACTIVE_STATUSES } },
    });
    return count > 0;
  }

  async create(dto: CreateExpectedReceiptDto, actorEmail?: string, actorId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Товар не найден');

    const orderedQty = new Prisma.Decimal(dto.orderedQty);
    const row = await this.prisma.expectedReceipt.create({
      data: {
        productId: dto.productId,
        orderedQty,
        receivedQty: new Prisma.Decimal(0),
        status: ExpectedReceiptStatus.ORDERED,
        comment: dto.comment?.trim() || null,
        createdBy: actorEmail ?? null,
        events: {
          create: {
            type: ExpectedReceiptEventType.CREATED,
            quantity: orderedQty,
            message: dto.comment?.trim() || null,
            actorEmail: actorEmail ?? null,
          },
        },
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });

    await this.audit.write({
      actorId,
      action: 'expected_receipt.create',
      entityType: 'expected_receipt',
      entityId: row.id,
      metadata: { productId: row.productId, orderedQty: dto.orderedQty },
    });

    return mapReceipt(row);
  }

  async update(id: string, dto: UpdateExpectedReceiptDto, actorEmail?: string, actorId?: string) {
    const current = await this.prisma.expectedReceipt.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!current) throw new NotFoundException('Ожидание не найдено');
    if (!ACTIVE_STATUSES.includes(current.status)) {
      throw new BadRequestException('Редактирование доступно только для активных ожиданий');
    }

    const receivedN = decimalToNumber(current.receivedQty);
    if (dto.orderedQty != null && dto.orderedQty < receivedN) {
      throw new BadRequestException('Заказанное количество не может быть меньше уже принятого');
    }

    const orderedQty =
      dto.orderedQty != null ? new Prisma.Decimal(dto.orderedQty) : current.orderedQty;
    const status = resolveStatus(orderedQty, current.receivedQty, current.status);

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.expectedReceipt.update({
        where: { id },
        data: {
          ...(dto.orderedQty != null ? { orderedQty } : {}),
          ...(dto.comment !== undefined ? { comment: dto.comment?.trim() || null } : {}),
          status,
        },
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });

      if (dto.orderedQty != null || dto.comment !== undefined) {
        await tx.expectedReceiptEvent.create({
          data: {
            expectedReceiptId: id,
            type: ExpectedReceiptEventType.UPDATED,
            message: dto.reason.trim(),
            actorEmail: actorEmail ?? null,
          },
        });
      }

      return tx.expectedReceipt.findUniqueOrThrow({
        where: { id },
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });
    });

    await this.audit.write({
      actorId,
      action: 'expected_receipt.update',
      entityType: 'expected_receipt',
      entityId: id,
      metadata: { changes: JSON.parse(JSON.stringify(dto)) },
    });

    return mapReceipt(row);
  }

  async cancel(id: string, comment: string, actorEmail?: string, actorId?: string) {
    const current = await this.prisma.expectedReceipt.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Ожидание не найдено');
    if (!ACTIVE_STATUSES.includes(current.status)) {
      throw new BadRequestException('Ожидание уже закрыто или отменено');
    }

    const message = comment.trim();
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.expectedReceiptEvent.create({
        data: {
          expectedReceiptId: id,
          type: ExpectedReceiptEventType.CANCELLED,
          message,
          actorEmail: actorEmail ?? null,
        },
      });
      return tx.expectedReceipt.update({
        where: { id },
        data: { status: ExpectedReceiptStatus.CANCELLED },
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });
    });

    await this.audit.write({
      actorId,
      action: 'expected_receipt.cancel',
      entityType: 'expected_receipt',
      entityId: id,
      metadata: { comment: message },
    });

    return mapReceipt(row);
  }

  async close(id: string, comment: string, actorEmail?: string, actorId?: string) {
    const current = await this.prisma.expectedReceipt.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Ожидание не найдено');
    if (!ACTIVE_STATUSES.includes(current.status)) {
      throw new BadRequestException('Ожидание уже закрыто или отменено');
    }

    const message = comment.trim();
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.expectedReceiptEvent.create({
        data: {
          expectedReceiptId: id,
          type: ExpectedReceiptEventType.CLOSED,
          message,
          actorEmail: actorEmail ?? null,
        },
      });
      return tx.expectedReceipt.update({
        where: { id },
        data: { status: ExpectedReceiptStatus.RECEIVED },
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });
    });

    await this.audit.write({
      actorId,
      action: 'expected_receipt.close',
      entityType: 'expected_receipt',
      entityId: id,
      metadata: { comment: message },
    });

    return mapReceipt(row);
  }

  async remove(id: string, actorId?: string) {
    const current = await this.prisma.expectedReceipt.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Ожидание не найдено');
    if (decimalToNumber(current.receivedQty) > 0) {
      throw new BadRequestException('Нельзя удалить ожидание с историей приёмки');
    }

    await this.prisma.expectedReceipt.delete({ where: { id } });
    await this.audit.write({
      actorId,
      action: 'expected_receipt.delete',
      entityType: 'expected_receipt',
      entityId: id,
    });
    return { deleted: true };
  }

  /**
   * Links physical receive qty to an expected receipt (does not touch inventory).
   */
  async applyReceiveLink(
    expectedReceiptId: string,
    productId: string,
    quantity: number,
    actorEmail?: string,
    actorId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpectedReceiptDto> {
    const qty = new Prisma.Decimal(quantity);
    if (decimalToNumber(qty) <= 0) {
      throw new BadRequestException('Укажите положительное количество для связи');
    }

    const run = async (client: Prisma.TransactionClient) => {
      const current = await client.expectedReceipt.findUnique({ where: { id: expectedReceiptId } });
      if (!current) throw new NotFoundException('Ожидание не найдено');
      if (current.productId !== productId) {
        throw new BadRequestException('Ожидание относится к другому товару');
      }
      if (!ACTIVE_STATUSES.includes(current.status)) {
        throw new BadRequestException('Ожидание неактивно');
      }

      const rem = remainingQty(current.orderedQty, current.receivedQty);
      if (decimalToNumber(qty) > rem) {
        throw new BadRequestException(
          `Количество превышает остаток ожидания (${rem})`,
        );
      }

      const newReceived = current.receivedQty.add(qty);
      const status = resolveStatus(current.orderedQty, newReceived, current.status);

      await client.expectedReceiptEvent.create({
        data: {
          expectedReceiptId,
          type: ExpectedReceiptEventType.RECEIVED,
          quantity: qty,
          actorEmail: actorEmail ?? null,
        },
      });

      if (status === ExpectedReceiptStatus.RECEIVED) {
        await client.expectedReceiptEvent.create({
          data: {
            expectedReceiptId,
            type: ExpectedReceiptEventType.CLOSED,
            actorEmail: actorEmail ?? null,
          },
        });
      }

      const updated = await client.expectedReceipt.update({
        where: { id: expectedReceiptId },
        data: { receivedQty: newReceived, status },
        include: { events: { orderBy: { createdAt: 'asc' } } },
      });

      return mapReceipt(updated);
    };

    if (tx) return run(tx);

    const result = await this.prisma.$transaction(run);
    await this.audit.write({
      actorId,
      action: 'expected_receipt.receive_link',
      entityType: 'expected_receipt',
      entityId: expectedReceiptId,
      metadata: { productId, quantity },
    });
    return result;
  }
}
