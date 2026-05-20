import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LotStatus } from '@prisma/client';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

export type ValidationIssue = {
  code: string;
  message: string;
  entityType?: string;
  entityId?: string;
};

@Injectable()
export class InventoryValidationService {
  private readonly logger = new Logger(InventoryValidationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  assertNonNegative(quantity: number, context: string): void {
    if (quantity < 0) {
      throw new BadRequestException(`Отрицательный остаток запрещён: ${context}`);
    }
  }

  assertWriteoffAllowed(
    lotStatus: LotStatus,
    expiryDate: Date | null,
    quantity: number,
    available: number,
  ): void {
    this.assertNonNegative(available - quantity, 'списание');

    if (quantity > available) {
      throw new BadRequestException('Недостаточно доступного остатка для списания');
    }

    if (lotStatus === LotStatus.BLOCKED) {
      throw new BadRequestException('Заблокированная партия не может быть списана');
    }

    if (lotStatus === LotStatus.QUARANTINE) {
      throw new BadRequestException('Партия в карантине не может быть списана');
    }

    if (expiryDate && expiryDate.getTime() < Date.now()) {
      this.logger.warn(`Writeoff on expired lot expiry=${expiryDate.toISOString()}`);
    }
  }

  assertLotMovable(lotStatus: LotStatus): void {
    if (lotStatus === LotStatus.BLOCKED) {
      throw new BadRequestException('Заблокированная партия не может перемещаться');
    }
  }

  async logFefoViolation(
    productId: string,
    expectedLotId: string,
    actualLotId: string,
    actorId?: string,
  ): Promise<void> {
    await this.auditLog.write({
      actorId,
      action: 'inventory.fefo.violation',
      entityType: 'product',
      entityId: productId,
      metadata: { expectedLotId, actualLotId },
    });
    this.logger.warn(
      `FEFO violation product=${productId} expected=${expectedLotId} actual=${actualLotId}`,
    );
  }

  async reconcileLot(lotId: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const lot = await this.prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        inventoryRows: true,
        movements: { where: { lotId } },
      },
    });
    if (!lot) return issues;

    const inventoryTotal = lot.inventoryRows.reduce(
      (s, r) => s + decimalToNumber(r.quantity),
      0,
    );

    if (inventoryTotal < 0) {
      issues.push({
        code: 'NEGATIVE_STOCK',
        message: 'Отрицательный остаток по партии',
        entityType: 'lot',
        entityId: lotId,
      });
    }

    let netFromMovements = 0;
    for (const m of lot.movements) {
      const q = decimalToNumber(m.quantity);
      if (m.type === 'RECEIPT' || m.type === 'UNBLOCK') netFromMovements += q;
      else if (m.type === 'ISSUE') netFromMovements -= q;
    }

    const drift = Math.abs(inventoryTotal - netFromMovements);
    if (drift > 0.0001 && lot.movements.length > 0) {
      issues.push({
        code: 'MOVEMENT_DRIFT',
        message: `Расхождение остатка (${inventoryTotal}) и движений (${netFromMovements})`,
        entityType: 'lot',
        entityId: lotId,
      });
    }

    return issues;
  }

  async runReconciliation(): Promise<{ issues: ValidationIssue[]; checked: number }> {
    const lots = await this.prisma.lot.findMany({
      where: { inventoryRows: { some: { quantity: { gt: 0 } } } },
      select: { id: true },
      take: 500,
    });

    const issues: ValidationIssue[] = [];
    for (const { id } of lots) {
      const lotIssues = await this.reconcileLot(id);
      issues.push(...lotIssues);
    }

    if (issues.length > 0) {
      await this.auditLog.write({
        action: 'inventory.reconciliation.mismatch',
        entityType: 'system',
        metadata: { count: issues.length, sample: issues.slice(0, 10) },
      });
    }

    return { issues, checked: lots.length };
  }
}
