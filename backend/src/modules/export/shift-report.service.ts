import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, UserRole } from '@prisma/client';
import { resolveWriteoffDestinationLabel } from '../../common/utils/writeoff-destination-label';
import { decimalToNumber } from '../../common/utils/decimal.util';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { DEFAULT_SYSTEM_SETTINGS } from '../settings/settings.types';
import {
  buildAuditPdfRow,
  resolveAuditActionLabel,
} from './shift-report-audit-labels';
import {
  activityHistoryRetentionMs,
  DEFAULT_ACTIVITY_HISTORY_RETENTION_DAYS,
  MOVEMENT_TYPE_LABELS,
  SHIFT_REPORT_EXCLUDED_AUDIT_ACTIONS,
} from './shift-report.constants';
import {
  buildShiftReportPdf,
  type ShiftReportPdfEvent,
} from './shift-report-pdf.util';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  OPERATOR: 'Оператор склада',
  VIEWER: 'Наблюдатель',
};

@Injectable()
export class ShiftReportService {
  private readonly logger = new Logger(ShiftReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private async resolveArchiveRetentionDays(): Promise<number> {
    const sys = await this.settings.get();
    const raw = Math.floor(
      sys.activityHistoryRetentionDays ??
        DEFAULT_SYSTEM_SETTINGS.activityHistoryRetentionDays,
    );
    return Math.max(
      1,
      Math.min(3650, Number.isFinite(raw) ? raw : DEFAULT_ACTIVITY_HISTORY_RETENTION_DAYS),
    );
  }

  async generatePdf(targetUserId: string, fromIso: string, toIso: string): Promise<{
    buffer: Buffer;
    filename: string;
  }> {
    const periodFrom = new Date(fromIso);
    const periodTo = new Date(toIso);

    if (Number.isNaN(periodFrom.getTime()) || Number.isNaN(periodTo.getTime())) {
      throw new BadRequestException('Некорректный формат даты');
    }
    if (periodFrom > periodTo) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания');
    }

    const now = new Date();
    const archiveDays = await this.resolveArchiveRetentionDays();
    const maxRangeMs = activityHistoryRetentionMs(archiveDays);
    const archiveCutoff = new Date(now.getTime() - maxRangeMs);

    if (periodFrom < archiveCutoff) {
      throw new BadRequestException(
        `Период не может начинаться ранее ${archiveDays} суток назад (срок архива)`,
      );
    }
    if (periodTo.getTime() - periodFrom.getTime() > maxRangeMs) {
      throw new BadRequestException(
        `Максимальная длительность периода — ${archiveDays} суток`,
      );
    }

    void this.purgeExpiredArchive(archiveDays);

    const dbUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { displayName: true, email: true, role: true },
    });

    if (!dbUser) {
      throw new NotFoundException('Сотрудник не найден');
    }

    const employeeEmail = dbUser.email;
    const employeeName =
      dbUser?.displayName?.trim() ||
      employeeEmail.split('@')[0]?.replace(/[._-]/g, ' ') ||
      employeeEmail;

    const [movements, auditRows] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: {
          actorEmail: { equals: employeeEmail, mode: 'insensitive' },
          createdAt: { gte: periodFrom, lte: periodTo },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          product: { select: { sku: true, name: true } },
          lot: { select: { lotNumber: true } },
          destination: { select: { name: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          actorId: targetUserId,
          createdAt: { gte: periodFrom, lte: periodTo },
          action: { notIn: [...SHIFT_REPORT_EXCLUDED_AUDIT_ACTIONS] },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const events: ShiftReportPdfEvent[] = [];

    for (const m of movements) {
      const qtyNum = decimalToNumber(m.quantity);
      const isReceipt =
        m.type === MovementType.RECEIPT || m.type === MovementType.UNBLOCK;
      const isIssue = m.type === MovementType.ISSUE;
      const sign = isReceipt ? '+' : isIssue ? '-' : '';
      const qtyDisplay =
        qtyNum === 0 ? '0' : `${sign}${Math.abs(qtyNum).toLocaleString('ru-RU')}`;

      const destination =
        isIssue
          ? resolveWriteoffDestinationLabel(
              m.destination,
              m.writeOffDestination,
              m.writeOffComment,
            )
          : null;

      const typeLabel = MOVEMENT_TYPE_LABELS[m.type];
      let details = '';
      if (isIssue && destination) {
        details = `Списано → ${destination}`;
      }
      if (m.editReason) {
        details = details
          ? `${details} · ${m.editReason}`
          : m.editReason;
      }

      events.push({
        at: m.createdAt,
        source: 'movement',
        typeLabel,
        document: m.reference,
        ref: m.product.sku,
        product: m.product.name,
        lot: m.lot?.lotNumber ?? '',
        qty: qtyDisplay,
        details,
      });
    }

    for (const row of auditRows) {
      const typeLabel = resolveAuditActionLabel(row.action);
      const auditFields = buildAuditPdfRow(row.action, row.entityId, row.metadata);
      events.push({
        at: row.createdAt,
        source: 'audit',
        typeLabel,
        document: auditFields.document,
        ref: auditFields.ref,
        product: auditFields.product,
        lot: auditFields.lot,
        qty: auditFields.qty,
        details: auditFields.details,
      });
    }

    events.sort((a, b) => a.at.getTime() - b.at.getTime());

    const summaryMap = new Map<string, number>();
    for (const ev of events) {
      summaryMap.set(ev.typeLabel, (summaryMap.get(ev.typeLabel) ?? 0) + 1);
    }
    const summaryByType = [...summaryMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const buffer = await buildShiftReportPdf({
      employeeName,
      employeeEmail,
      roleLabel: ROLE_LABELS[dbUser.role],
      periodFrom,
      periodTo,
      generatedAt: now,
      events,
      summaryByType,
      archiveRetentionDays: archiveDays,
    });

    const fromTag = periodFrom.toISOString().slice(0, 10);
    const toTag = periodTo.toISOString().slice(0, 10);
    const emailLocal = employeeEmail.split('@')[0]?.replace(/[^a-zA-Z0-9_-]/g, '_') ?? 'user';
    const filename = `otchet_smeny_${emailLocal}_${fromTag}_${toTag}.pdf`;

    return { buffer, filename };
  }

  /** Удаляет записи аудита старше срока архива (скользящее окно из настроек склада). */
  private async purgeExpiredArchive(archiveDays: number): Promise<void> {
    const cutoff = new Date(Date.now() - activityHistoryRetentionMs(archiveDays));
    try {
      const result = await this.prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        this.logger.log(`Архив аудита: удалено ${result.count} записей старше ${archiveDays} сут.`);
      }
    } catch (err) {
      this.logger.warn(`Не удалось очистить архив аудита: ${String(err)}`);
    }
  }
}
