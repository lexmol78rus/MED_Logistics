import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShipmentPickingOutcome, ShipmentStatus, UserRole } from '@prisma/client';
import {
  formatPickingCompleteWarehouseMessage,
  shipmentPickingOutcomeLabel,
} from '../../common/utils/shipment-picking-outcome.util';
import { CompleteShipmentPickingDto } from './dto/complete-shipment-picking.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { ShipmentAssemblyReservationService } from './shipment-assembly-reservation.service';
import { shipmentReservationActor } from './shipment-reservation.actor';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { findProductIdsByRefs, normalizeProductRef } from '../../common/utils/product-ref.util';
import {
  isEditableShipmentStatus,
  shipmentStatusAfterRefValidation,
  validateShipmentItemRefs,
  type ShipmentRefValidation,
} from '../../common/utils/shipment-ref-validation.util';
import { CreateShipmentDto, CreateShipmentItemDto } from './dto/create-shipment.dto';
import {
  countRefLinkSummary,
  presentShipmentItem,
  presentShipmentItemForPrint,
} from './shipment-item.presenter';

function isValidShipmentItemName(name: string): boolean {
  const n = (name ?? '').trim();
  if (n.length < 5) return false;
  if (/^\d{1,4}$/.test(n)) return false;
  return true;
}

/** Убирает мусорные строки и дубли по номеру позиции контракта (оставляем с более длинным наименованием). */
function sanitizeShipmentItems<T extends { name: string; contractLineNo?: number | null }>(items: T[]): T[] {
  const byLine = new Map<number, T>();
  const noLine: T[] = [];

  for (const it of items) {
    if (!isValidShipmentItemName(it.name)) continue;
    const line = it.contractLineNo ?? 0;
    if (line <= 0) {
      noLine.push(it);
      continue;
    }
    const prev = byLine.get(line);
    if (!prev || it.name.length > prev.name.length) {
      byLine.set(line, it);
    }
  }

  const numbered = [...byLine.values()].sort((a, b) => (a.contractLineNo ?? 0) - (b.contractLineNo ?? 0));
  return [...numbered, ...noLine];
}

function sanitizeCreateItems(items: CreateShipmentItemDto[]): CreateShipmentItemDto[] {
  return sanitizeShipmentItems(
    items.map((it, idx) => ({
      ...it,
      contractLineNo: it.contractLineNo ?? idx + 1,
    })),
  );
}

function parseDecimal(value: string | null | undefined): Decimal | null {
  const raw = (value ?? '').toString().trim().replace(/\s+/g, '');
  if (!raw) return null;
  const normalized = raw.replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return new Prisma.Decimal(num);
}

const shipmentItemInclude = {
  product: { select: { id: true, sku: true, name: true } },
} as const;

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assemblyReservations: ShipmentAssemblyReservationService,
  ) {}

  private async productIdByRefForItems(items: CreateShipmentItemDto[]): Promise<Map<string, string>> {
    return findProductIdsByRefs(
      this.prisma,
      items.map((it) => it.code),
    );
  }

  private productIdForItem(
    refMap: Map<string, string>,
    code: string | null | undefined,
  ): string | null {
    const ref = normalizeProductRef(code);
    if (!ref) return null;
    return refMap.get(ref) ?? null;
  }

  /** Пересвязать REF позиций с номенклатурой (sku). */
  async refreshItemProductLinks(shipmentId: string): Promise<void> {
    const rows = await this.prisma.shipmentItem.findMany({
      where: { shipmentId },
      select: { id: true, code: true },
    });
    if (!rows.length) return;

    const refMap = await findProductIdsByRefs(
      this.prisma,
      rows.map((r) => r.code),
    );

    await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.shipmentItem.update({
          where: { id: row.id },
          data: { productId: this.productIdForItem(refMap, row.code) },
        }),
      ),
    );
  }

  private pickingStatuses(): ShipmentStatus[] {
    return [ShipmentStatus.PICKING, ShipmentStatus.PICKING_ON_HOLD];
  }

  private async notifyWarehouseOperators(params: {
    type: string;
    title: string;
    message: string;
    shipmentId: string;
    actorEmail?: string;
    priority?: 'HIGH' | 'NORMAL';
  }) {
    const operators = await this.prisma.user.findMany({
      where: { role: UserRole.OPERATOR, isActive: true, deletedAt: null },
      select: { id: true },
      take: 200,
    });
    if (!operators.length) return;

    await this.prisma.notification.createMany({
      data: operators.map((u) => ({
        userId: u.id,
        type: params.type,
        priority: params.priority ?? 'HIGH',
        title: params.title,
        message: params.message,
        href: `/shipments`,
        channel: 'in_app',
        payload: { shipmentId: params.shipmentId, actorEmail: params.actorEmail ?? null },
      })),
    });
  }

  async list(status?: ShipmentStatus) {
    const where: Prisma.ShipmentWhereInput =
      status === ShipmentStatus.PICKING
        ? { status: { in: this.pickingStatuses() } }
        : status
          ? { status }
          : {};
    const rows = await this.prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        counterparty: { select: { id: true, name: true, type: true } },
        legalEntity: { select: { id: true, name: true, type: true } },
        contract: { select: { id: true, number: true } },
        items: { select: { id: true, name: true, code: true } },
      },
    });

    return {
      items: rows.map((s) => ({
        id: s.id,
        status: s.status,
        counterparty: s.counterparty,
        legalEntity: s.legalEntity,
        contract: s.contract,
        note: s.note,
        createdBy: s.createdBy,
        pickingSentAt: s.pickingSentAt?.toISOString() ?? null,
        pickingPausedAt: s.pickingPausedAt?.toISOString() ?? null,
        pickingRecalledAt: s.pickingRecalledAt?.toISOString() ?? null,
        warehouseMessage: s.warehouseMessage,
        pickingOutcome: s.pickingOutcome,
        pickingCompleteComment: s.pickingCompleteComment,
        pickedAt: s.pickedAt?.toISOString() ?? null,
        writeoffCompletedAt: s.writeoffCompletedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        itemsCount: s.items.length,
        itemNames: s.items.map((i) => i.name),
        itemRefs: s.items.map((i) => i.code?.trim()).filter((c): c is string => !!c),
      })),
    };
  }

  async get(id: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        counterparty: { select: { id: true, name: true, inn: true, kpp: true, type: true } },
        legalEntity: { select: { id: true, name: true, inn: true, kpp: true, type: true } },
        contract: { select: { id: true, number: true, date: true, title: true } },
        items: { orderBy: { contractLineNo: 'asc' }, include: shipmentItemInclude },
      },
    });
    if (!s) throw new NotFoundException('Отгрузка не найдена');
    const items = sanitizeShipmentItems(s.items).map((i) => presentShipmentItem(i));
    const refLinkSummary = countRefLinkSummary(items);
    return {
      id: s.id,
      status: s.status,
      counterpartyId: s.counterpartyId,
      legalEntityId: s.legalEntityId,
      contractId: s.contractId,
      note: s.note,
      createdBy: s.createdBy,
      pickingSentAt: s.pickingSentAt?.toISOString() ?? null,
      pickingPausedAt: s.pickingPausedAt?.toISOString() ?? null,
      pickingRecalledAt: s.pickingRecalledAt?.toISOString() ?? null,
      warehouseMessage: s.warehouseMessage,
      pickingOutcome: s.pickingOutcome,
      pickingCompleteComment: s.pickingCompleteComment,
      pickedAt: s.pickedAt?.toISOString() ?? null,
      writeoffCompletedAt: s.writeoffCompletedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      counterparty: s.counterparty,
      legalEntity: s.legalEntity,
      contract: s.contract
        ? { ...s.contract, date: s.contract.date?.toISOString() ?? null }
        : null,
      items,
      refLinkSummary,
    };
  }

  private async requireLegalEntityId(id: string): Promise<void> {
    const row = await this.prisma.counterparty.findUnique({ where: { id }, select: { id: true, type: true } });
    if (!row || row.type !== 'LEGAL_ENTITY') {
      throw new BadRequestException('Некорректное юр. лицо для отгрузки');
    }
  }

  async create(dto: CreateShipmentDto, createdBy?: string, createdByUserId?: string) {
    const items = sanitizeCreateItems(dto.items ?? []);
    if (!items.length) throw new BadRequestException('Пустая отгрузка');

    if (!dto.legalEntityId) {
      throw new BadRequestException('Выберите юр. лицо от которого отгружаем');
    }
    await this.requireLegalEntityId(dto.legalEntityId);

    const refMap = await this.productIdByRefForItems(items);
    const refValidation = validateShipmentItemRefs(items, refMap);
    const targetStatus = shipmentStatusAfterRefValidation(refValidation.isDraft);

    const shipment = await this.prisma.shipment.create({
      data: {
        status: targetStatus,
        counterpartyId: dto.counterpartyId ?? null,
        legalEntityId: dto.legalEntityId ?? null,
        contractId: dto.contractId ?? null,
        note: dto.note?.trim() || null,
        createdBy: createdBy ?? null,
        items: {
          create: items.map((it, idx) => ({
            name: it.name.trim(),
            code: it.code?.trim() || null,
            productId: this.productIdForItem(refMap, it.code),
            unit: it.unit?.trim() || null,
            vatRate: it.vatRate?.trim() || null,
            priceWithVat: parseDecimal(it.priceWithVat),
            quantity: parseDecimal(it.quantity) ?? new Prisma.Decimal(0),
            sum: parseDecimal(it.sum),
            contractLineNo: it.contractLineNo ?? idx + 1,
            managerNote: it.managerNote?.trim() || null,
            managerTag: it.managerTag?.trim() || null,
          })),
        },
      },
    });

    const savedItems = await this.prisma.shipmentItem.findMany({
      where: { shipmentId: shipment.id },
      select: { productId: true, quantity: true },
    });
    await this.assemblyReservations.syncForShipment(
      shipment.id,
      this.assemblyReservations.aggregateLines(savedItems),
      shipmentReservationActor(createdBy, createdByUserId),
    );

    const reservation = this.summarizeReservationLines(
      this.assemblyReservations.aggregateLines(savedItems),
    );

    return { id: shipment.id, status: targetStatus, reservation, refValidation };
  }

  async update(id: string, dto: CreateShipmentDto, actorEmail?: string, actorUserId?: string) {
    const items = sanitizeCreateItems(dto.items ?? []);
    if (!items.length) throw new BadRequestException('Пустая отгрузка');

    if (!dto.legalEntityId) {
      throw new BadRequestException('Выберите юр. лицо от которого отгружаем');
    }
    await this.requireLegalEntityId(dto.legalEntityId);

    const existing = await this.prisma.shipment.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) throw new NotFoundException('Отгрузка не найдена');
    if (!isEditableShipmentStatus(existing.status)) {
      throw new BadRequestException('Редактирование доступно только для черновика или статуса «Новый»');
    }

    const refMap = await this.productIdByRefForItems(items);
    const refValidation = validateShipmentItemRefs(items, refMap);
    const targetStatus = shipmentStatusAfterRefValidation(refValidation.isDraft);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.shipmentItem.deleteMany({ where: { shipmentId: id } });

      const row = await tx.shipment.update({
        where: { id },
        data: {
          status: targetStatus,
          counterpartyId: dto.counterpartyId ?? null,
          legalEntityId: dto.legalEntityId ?? null,
          contractId: dto.contractId ?? null,
          note: dto.note?.trim() || null,
          createdBy: actorEmail ?? null,
          items: {
            create: items.map((it, idx) => ({
              name: it.name.trim(),
              code: it.code?.trim() || null,
              productId: this.productIdForItem(refMap, it.code),
              unit: it.unit?.trim() || null,
              vatRate: it.vatRate?.trim() || null,
              priceWithVat: parseDecimal(it.priceWithVat),
              quantity: parseDecimal(it.quantity) ?? new Prisma.Decimal(0),
              sum: parseDecimal(it.sum),
              contractLineNo: it.contractLineNo ?? idx + 1,
              managerNote: it.managerNote?.trim() || null,
              managerTag: it.managerTag?.trim() || null,
            })),
          },
        },
        select: { id: true, status: true, updatedAt: true },
      });

      const savedItems = await tx.shipmentItem.findMany({
        where: { shipmentId: id },
        select: { productId: true, quantity: true },
      });
      await this.assemblyReservations.syncForShipment(
        id,
        this.assemblyReservations.aggregateLines(savedItems),
        shipmentReservationActor(actorEmail, actorUserId),
        tx,
      );

      return row;
    });

    const reservation = this.summarizeReservationLines(
      this.assemblyReservations.aggregateLines(
        await this.prisma.shipmentItem.findMany({
          where: { shipmentId: id },
          select: { productId: true, quantity: true },
        }),
      ),
    );

    return {
      ok: true as const,
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
      reservation,
      refValidation,
    };
  }

  private summarizeReservationLines(
    lines: Array<{ productId: string; quantity: number }>,
  ): { lines: number; quantity: number } {
    return {
      lines: lines.length,
      quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    };
  }

  async sendToPicking(id: string, actorEmail?: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: { counterparty: { select: { name: true } } },
    });
    if (!s) throw new NotFoundException('Отгрузка не найдена');
    if (s.status === ShipmentStatus.DRAFT) {
      throw new BadRequestException(
        'Отгрузка в черновике: исправьте REF, которых нет в номенклатуре, и сохраните снова',
      );
    }
    if (s.status !== ShipmentStatus.NEW) {
      throw new BadRequestException('Отгрузка уже отправлена на сборку или собрана');
    }

    await this.refreshItemProductLinks(id);
    const items = await this.prisma.shipmentItem.findMany({
      where: { shipmentId: id },
      select: { code: true, productId: true },
    });
    const refMap = await findProductIdsByRefs(
      this.prisma,
      items.map((i) => i.code),
    );
    const refValidation = validateShipmentItemRefs(items, refMap);
    if (refValidation.isDraft) {
      await this.prisma.shipment.update({
        where: { id },
        data: { status: ShipmentStatus.DRAFT },
      });
      throw new BadRequestException(
        `REF не найдены в номенклатуре: ${refValidation.notFoundRefs.join(', ')}`,
      );
    }

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.PICKING,
        pickingSentAt: new Date(),
        pickingPausedAt: null,
        pickingRecalledAt: null,
        warehouseMessage: null,
      },
    });

    const customerName = s.counterparty?.name ?? '—';
    await this.notifyWarehouseOperators({
      type: 'shipment_picking',
      title: 'Заказ на сборку',
      message: `Новая заявка на сборку: ${customerName}`,
      shipmentId: id,
      actorEmail,
    });

    return {
      ok: true as const,
      id: updated.id,
      status: updated.status,
      pickingSentAt: updated.pickingSentAt?.toISOString() ?? null,
    };
  }

  async pausePicking(id: string, comment: string, actorEmail?: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: { counterparty: { select: { name: true } } },
    });
    if (!s) throw new NotFoundException('Отгрузка не найдена');
    if (s.status !== ShipmentStatus.PICKING) {
      throw new BadRequestException('Приостановить можно только активную сборку');
    }

    const note = comment.trim();
    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.PICKING_ON_HOLD,
        pickingPausedAt: new Date(),
        warehouseMessage: note,
      },
    });

    const customerName = s.counterparty?.name ?? '—';
    await this.notifyWarehouseOperators({
      type: 'shipment_picking_paused',
      title: 'Сборка приостановлена',
      message: `${customerName}: ${note}`,
      shipmentId: id,
      actorEmail,
    });

    return {
      ok: true as const,
      id: updated.id,
      status: updated.status,
      warehouseMessage: updated.warehouseMessage,
      pickingPausedAt: updated.pickingPausedAt?.toISOString() ?? null,
    };
  }

  async resumePicking(id: string, comment: string | undefined, actorEmail?: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: { counterparty: { select: { name: true } } },
    });
    if (!s) throw new NotFoundException('Отгрузка не найдена');
    if (s.status !== ShipmentStatus.PICKING_ON_HOLD) {
      throw new BadRequestException('Возобновить можно только приостановленную сборку');
    }

    const resumeNote = comment?.trim();
    const warehouseMessage = resumeNote
      ? `Сборка возобновлена. ${resumeNote}`
      : 'Сборка возобновлена — продолжайте по листу.';

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.PICKING,
        pickingPausedAt: null,
        warehouseMessage,
      },
    });

    const customerName = s.counterparty?.name ?? '—';
    await this.notifyWarehouseOperators({
      type: 'shipment_picking_resumed',
      title: 'Сборка возобновлена',
      message: `${customerName}: ${warehouseMessage}`,
      shipmentId: id,
      actorEmail,
    });

    return {
      ok: true as const,
      id: updated.id,
      status: updated.status,
      warehouseMessage: updated.warehouseMessage,
    };
  }

  async recallFromPicking(id: string, comment: string, actorEmail?: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: { counterparty: { select: { name: true } } },
    });
    if (!s) throw new NotFoundException('Отгрузка не найдена');
    if (!this.pickingStatuses().includes(s.status)) {
      throw new BadRequestException('Отозвать можно только заказ в сборке или на паузе');
    }

    const note = comment.trim();
    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.NEW,
        pickingSentAt: null,
        pickingPausedAt: null,
        pickingRecalledAt: new Date(),
        pickingOutcome: null,
        pickingCompleteComment: null,
        pickedAt: null,
        writeoffCompletedAt: null,
        warehouseMessage: note,
      },
    });

    const customerName = s.counterparty?.name ?? '—';
    await this.notifyWarehouseOperators({
      type: 'shipment_picking_recalled',
      title: 'Сборка отменена',
      message: `${customerName} — заказ отозван с склада: ${note}`,
      shipmentId: id,
      actorEmail,
      priority: 'HIGH',
    });

    return {
      ok: true as const,
      id: updated.id,
      status: updated.status,
      warehouseMessage: updated.warehouseMessage,
      pickingRecalledAt: updated.pickingRecalledAt?.toISOString() ?? null,
    };
  }

  async completePicking(id: string, dto: CompleteShipmentPickingDto, actorEmail?: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        counterparty: { select: { name: true } },
        contract: { select: { number: true } },
      },
    });
    if (!s) throw new NotFoundException('Отгрузка не найдена');
    if (!this.pickingStatuses().includes(s.status)) {
      throw new BadRequestException('Завершить сборку можно только для заказа в работе или на паузе');
    }

    await this.refreshItemProductLinks(id);

    const comment = dto.comment.trim();
    const warehouseMessage = formatPickingCompleteWarehouseMessage(dto.outcome, comment);

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.PICKED,
        pickedAt: new Date(),
        pickingPausedAt: null,
        pickingOutcome: dto.outcome,
        pickingCompleteComment: comment,
        warehouseMessage,
      },
    });

    const customerName = s.counterparty?.name ?? '—';
    const managers = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.MANAGER, UserRole.ADMIN] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
      take: 200,
    });
    if (managers.length) {
      await this.prisma.notification.createMany({
        data: managers.map((u) => ({
          userId: u.id,
          type: 'shipment_picking_complete',
          priority: dto.outcome === ShipmentPickingOutcome.SUCCESS ? 'NORMAL' : 'HIGH',
          title: shipmentPickingOutcomeLabel(dto.outcome),
          message: `${customerName}: ${comment}`,
          href: `/shipments/${id}/print`,
          channel: 'in_app',
          payload: {
            shipmentId: id,
            outcome: dto.outcome,
            actorEmail: actorEmail ?? null,
          },
        })),
      });
    }

    return {
      ok: true as const,
      id: updated.id,
      status: updated.status,
      pickingOutcome: updated.pickingOutcome,
      pickingCompleteComment: updated.pickingCompleteComment,
      warehouseMessage: updated.warehouseMessage,
      pickedAt: updated.pickedAt?.toISOString() ?? null,
    };
  }

  async finalizeWriteoff(shipmentId: string, actorEmail?: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { counterparty: { select: { name: true } } },
    });
    if (!s) return { ok: false as const, reason: 'not_found' as const };
    if (s.status !== ShipmentStatus.PICKED) {
      return { ok: false as const, reason: 'invalid_status' as const };
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: ShipmentStatus.DISPATCHED,
        writeoffCompletedAt: new Date(),
      },
    });

    await this.assemblyReservations.releaseForShipment(shipmentId);

    const customerName = s.counterparty?.name ?? '—';
    const managers = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.MANAGER, UserRole.ADMIN] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
      take: 200,
    });
    if (managers.length) {
      await this.prisma.notification.createMany({
        data: managers.map((u) => ({
          userId: u.id,
          type: 'shipment_dispatched',
          priority: 'NORMAL',
          title: 'Отгрузка списана со склада',
          message: `${customerName} — товар списан, отгрузка закрыта`,
          href: `/shipments`,
          channel: 'in_app',
          payload: { shipmentId, actorEmail: actorEmail ?? null },
        })),
      });
    }

    return {
      ok: true as const,
      id: updated.id,
      status: updated.status,
      writeoffCompletedAt: updated.writeoffCompletedAt?.toISOString() ?? null,
    };
  }

  async getWriteoffContext(shipmentId: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        counterparty: { select: { name: true } },
        contract: { select: { number: true } },
      },
    });
    if (!s) throw new NotFoundException('Отгрузка не найдена');
    return s;
  }

  async printData(id: string) {
    const existing = await this.prisma.shipment.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException('Отгрузка не найдена');

    if (this.pickingStatuses().includes(existing.status)) {
      await this.refreshItemProductLinks(id);
    }

    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        counterparty: { select: { name: true, inn: true, kpp: true } },
        legalEntity: { select: { name: true, inn: true, kpp: true } },
        contract: { select: { number: true, date: true, title: true } },
        items: { orderBy: { contractLineNo: 'asc' }, include: shipmentItemInclude },
      },
    });
    if (!s) throw new NotFoundException('Отгрузка не найдена');

    const visibleItems = sanitizeShipmentItems(s.items);
    const total = visibleItems.reduce((acc, i) => acc + decimalToNumber(i.sum), 0);
    const presented = visibleItems.map((i, idx) =>
      presentShipmentItemForPrint(i, i.contractLineNo ?? idx + 1),
    );

    return {
      id: s.id,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      pickingSentAt: s.pickingSentAt?.toISOString() ?? null,
      pickingPausedAt: s.pickingPausedAt?.toISOString() ?? null,
      pickingRecalledAt: s.pickingRecalledAt?.toISOString() ?? null,
      warehouseMessage: s.warehouseMessage,
      pickingOutcome: s.pickingOutcome,
      pickingCompleteComment: s.pickingCompleteComment,
      writeoffCompletedAt: s.writeoffCompletedAt?.toISOString() ?? null,
      counterparty: s.counterparty ?? null,
      legalEntity: s.legalEntity ?? null,
      contract: s.contract
        ? { ...s.contract, date: s.contract.date?.toISOString() ?? null }
        : null,
      items: presented.map((i) => ({
        lineNo: i.lineNo,
        name: i.name,
        code: i.code,
        unit: i.unit,
        vatRate: i.vatRate,
        priceWithVat: i.priceWithVat,
        quantity: i.quantity,
        sum: i.sum,
        managerNote: i.managerNote,
        managerTag: i.managerTag,
        productId: i.productId,
        productRef: i.productRef,
        productName: i.productName,
        refLinkStatus: i.refLinkStatus,
        targetQty: i.targetQty,
      })),
      refLinkSummary: countRefLinkSummary(presented),
      totals: {
        sum: total,
      },
    };
  }

  async writeoffCartSeed(id: string) {
    const existing = await this.prisma.shipment.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException('Отгрузка не найдена');

    if (existing.status !== ShipmentStatus.PICKED) {
      throw new BadRequestException(
        'Корзину списания можно формировать только после завершения сборки (кнопка «Готово»)',
      );
    }

    await this.refreshItemProductLinks(id);

    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        counterparty: { select: { name: true } },
        items: { orderBy: { contractLineNo: 'asc' }, include: shipmentItemInclude },
      },
    });
    if (!s) throw new NotFoundException('Отгрузка не найдена');

    const visibleItems = sanitizeShipmentItems(s.items);
    const lines = visibleItems.map((i, idx) => {
      const view = presentShipmentItemForPrint(i, i.contractLineNo ?? idx + 1);
      return {
        shipmentItemId: view.id,
        lineNo: view.lineNo,
        name: view.name,
        ref: view.code,
        quantity: view.targetQty,
        productId: view.productId,
        productRef: view.productRef,
        productName: view.productName,
        refLinkStatus: view.refLinkStatus,
      };
    });

    return {
      shipmentId: s.id,
      status: s.status,
      customerName: s.counterparty?.name ?? '—',
      lines,
      refLinkSummary: countRefLinkSummary(lines),
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.shipment.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) throw new NotFoundException('Отгрузка не найдена');
    if (!isEditableShipmentStatus(existing.status)) {
      throw new BadRequestException('Удаление доступно только для черновика или статуса «Новый»');
    }
    await this.prisma.shipment.delete({ where: { id } });
    return { ok: true as const };
  }
}

