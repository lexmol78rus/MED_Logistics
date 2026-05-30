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
  ACCOUNTANT: 'Бухгалтер',
  VIEWER: 'Наблюдатель',
};

/** Человекочитаемые подписи полей из settings.update (metadata.changes). */
const SETTINGS_CHANGE_LABELS: Record<string, string> = {
  warehouseName: 'Название склада',
  warehouseCode: 'Код склада',
  fefoEnabled: 'FEFO',
  fefoStrict: 'Строгий FEFO',
  expiryWarningDays: 'Предупр. по сроку (дн.)',
  expiryCriticalDays: 'Критич. по сроку (дн.)',
  scannerAutoFocus: 'Автофокус сканера',
  scannerDebounceMs: 'Задержка сканера (мс)',
  scannerSoundEnabled: 'Звук сканера',
  uiCompactMode: 'Компактный интерфейс',
  uiShowFefoHints: 'Подсказки FEFO',
  uiAnimations: 'Анимации',
  uiAutoRefreshDashboard: 'Автообновление дашборда',
  notificationEnabled: 'Уведомления',
  activityHistoryRetentionDays: 'Срок архива (дн.)',
};

@Injectable()
export class ShiftReportService {
  private readonly logger = new Logger(ShiftReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private formatChangeValue(value: unknown): string {
    if (value == null) return '—';
    if (typeof value === 'boolean') return value ? 'да' : 'нет';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private buildSettingsUpdateDetails(metadata: unknown): string {
    const meta = this.asRecord(metadata);
    const changes = this.asRecord(meta?.changes);
    if (!changes) return '';
    const keys = Object.keys(changes).filter(Boolean).sort();
    if (keys.length === 0) return '';

    const parts: string[] = [];
    for (const key of keys.slice(0, 4)) {
      const label = SETTINGS_CHANGE_LABELS[key] ?? key;
      parts.push(`${label}: ${this.formatChangeValue(changes[key])}`);
    }
    const rest = keys.length - parts.length;
    return `Настройки: ${parts.join('; ')}${rest > 0 ? `; +${rest}` : ''}`;
  }

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

    const fefoRows = auditRows.filter((r) => r.action === 'inventory.fefo.violation');
    const fefoProductIds = new Set<string>();
    const fefoLotIds = new Set<string>();
    for (const row of fefoRows) {
      if (row.entityId) fefoProductIds.add(row.entityId);
      const meta = this.asRecord(row.metadata);
      const expectedLotId = typeof meta?.expectedLotId === 'string' ? meta.expectedLotId : '';
      const actualLotId = typeof meta?.actualLotId === 'string' ? meta.actualLotId : '';
      if (expectedLotId) fefoLotIds.add(expectedLotId);
      if (actualLotId) fefoLotIds.add(actualLotId);
    }

    const [fefoProducts, fefoLots] =
      fefoProductIds.size > 0 || fefoLotIds.size > 0
        ? await Promise.all([
            fefoProductIds.size > 0
              ? this.prisma.product.findMany({
                  where: { id: { in: [...fefoProductIds] } },
                  select: { id: true, sku: true, name: true },
                })
              : Promise.resolve([]),
            fefoLotIds.size > 0
              ? this.prisma.lot.findMany({
                  where: { id: { in: [...fefoLotIds] } },
                  select: { id: true, lotNumber: true },
                })
              : Promise.resolve([]),
          ])
        : [[], []];

    const fefoProductById = new Map(fefoProducts.map((p) => [p.id, p]));
    const fefoLotNumberById = new Map(fefoLots.map((l) => [l.id, l.lotNumber]));

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

      // Для ряда действий аудита enrich-им метаданные, иначе в PDF получаются пустые строки.
      if (row.action === 'settings.update') {
        const details = this.buildSettingsUpdateDetails(row.metadata);
        if (!details) continue;
        events.push({
          at: row.createdAt,
          source: 'audit',
          typeLabel,
          document: '—',
          ref: '',
          product: '',
          lot: '',
          qty: '',
          details,
        });
        continue;
      }

      if (row.action === 'inventory.fefo.violation') {
        const meta = this.asRecord(row.metadata);
        const expectedLotId = typeof meta?.expectedLotId === 'string' ? meta.expectedLotId : '';
        const actualLotId = typeof meta?.actualLotId === 'string' ? meta.actualLotId : '';
        if (!row.entityId || (!expectedLotId && !actualLotId)) continue;

        const product = fefoProductById.get(row.entityId);
        const expectedLotNumber = expectedLotId
          ? (fefoLotNumberById.get(expectedLotId) ?? expectedLotId)
          : '';
        const actualLotNumber = actualLotId
          ? (fefoLotNumberById.get(actualLotId) ?? actualLotId)
          : '';

        const details = [
          expectedLotNumber && `Ожид.: ${expectedLotNumber}`,
          actualLotNumber && `Факт.: ${actualLotNumber}`,
        ]
          .filter(Boolean)
          .join(' · ');

        events.push({
          at: row.createdAt,
          source: 'audit',
          typeLabel,
          document: '—',
          ref: product?.sku ?? '',
          product: product?.name ?? '',
          lot: actualLotNumber,
          qty: '',
          details: details || typeLabel,
        });
        continue;
      }

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
