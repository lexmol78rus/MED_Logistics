import { Injectable } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { resolveWriteoffDestinationLabel } from '../../common/utils/writeoff-destination-label';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { resolveExpiryThresholds } from '../../common/utils/expiry-thresholds.util';
import { computeLotUiStatus } from '../../common/utils/inventory-status.util';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpiryService } from '../expiry/expiry.service';
import { SettingsService } from '../settings/settings.service';

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expiry: ExpiryService,
    private readonly settings: SettingsService,
  ) {}

  async productsCsv(): Promise<string> {
    const products = await this.prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: {
        barcodes: { take: 1, orderBy: { createdAt: 'asc' } },
        inventoryRows: { select: { quantity: true } },
        lots: { select: { id: true } },
      },
    });
    const header = ['REF', 'Название', 'Производитель', 'Штрихкод', 'Остаток', 'Партий'];
    const rows = products.map((p) => [
      p.sku,
      p.name,
      p.manufacturer,
      p.barcodes[0]?.barcode ?? '',
      p.inventoryRows.reduce((s, r) => s + decimalToNumber(r.quantity), 0),
      p.lots.length,
    ]);
    return '\uFEFF' + toCsv([header, ...rows]);
  }

  async lotsCsv(): Promise<string> {
    const cfg = await this.settings.get();
    const thresholds = resolveExpiryThresholds({
      warningDays: cfg.expiryWarningDays,
      criticalDays: cfg.expiryCriticalDays,
    });
    const lots = await this.prisma.lot.findMany({
      orderBy: [{ expiryDate: 'asc' }, { lotNumber: 'asc' }],
      include: {
        product: { select: { sku: true, name: true, manufacturer: true } },
        inventoryRows: { select: { quantity: true, location: true } },
      },
    });
    const header = ['LOT', 'REF', 'Номенклатура', 'Производитель', 'Срок', 'Остаток', 'Статус', 'Ячейка'];
    const rows = lots.map((lot) => {
      const qty = lot.inventoryRows.reduce((s, r) => s + decimalToNumber(r.quantity), 0);
      const location = lot.inventoryRows.find((r) => r.location)?.location ?? '';
      return [
        lot.lotNumber,
        lot.product.sku,
        lot.product.name,
        lot.product.manufacturer,
        lot.expiryDate?.toISOString().slice(0, 10) ?? '',
        qty,
        computeLotUiStatus(lot.status, lot.expiryDate, qty, thresholds),
        location,
      ];
    });
    return '\uFEFF' + toCsv([header, ...rows]);
  }

  async movementsCsv(options?: { today?: boolean }): Promise<string> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const movements = await this.prisma.stockMovement.findMany({
      where: options?.today
        ? { createdAt: { gte: startOfDay, lte: endOfDay } }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: options?.today ? undefined : 5000,
      include: {
        product: { select: { sku: true, name: true } },
        lot: { select: { lotNumber: true } },
        destination: { select: { name: true } },
      },
    });
    const labels: Record<MovementType, string> = {
      RECEIPT: 'ПРИХОД',
      ISSUE: 'РАСХОД',
      ADJUSTMENT: 'КОРРЕКТИРОВКА',
      QUARANTINE: 'КАРАНТИН',
      UNBLOCK: 'РАЗБЛОКИРОВКА',
      RECALL: 'ОТЗЫВ',
      BLOCK: 'БЛОКИРОВКА',
    };
    const header = [
      'Документ',
      'Дата',
      'Тип',
      'Движение',
      'Куда списано',
      'Приход',
      'Списание',
      'REF',
      'Номенклатура',
      'LOT',
      'Кол-во',
      'Оператор',
      'Время',
    ];
    const rows = movements.map((m) => {
      const qty = decimalToNumber(m.quantity);
      const isReceipt = m.type === MovementType.RECEIPT || m.type === MovementType.UNBLOCK;
      const isIssue = m.type === MovementType.ISSUE;
      const destination =
        isIssue
          ? resolveWriteoffDestinationLabel(
              m.destination,
              m.writeOffDestination,
              m.writeOffComment,
            ) ?? ''
          : '';
      const movementLabel =
        isIssue && destination ? `Списано → ${destination}` : labels[m.type];
      return [
        m.reference,
        m.createdAt.toISOString().slice(0, 10),
        labels[m.type],
        movementLabel,
        destination,
        isReceipt ? Math.abs(qty) : '',
        isIssue ? Math.abs(qty) : '',
        m.product.sku,
        m.product.name,
        m.lot?.lotNumber ?? '',
        qty,
        m.actorEmail ?? '',
        m.createdAt.toISOString(),
      ];
    });
    return '\uFEFF' + toCsv([header, ...rows]);
  }

  async expiryCsv(): Promise<string> {
    const { items } = await this.expiry.list({ page: 1, pageSize: 10000, filter: 'all' });
    const header = ['Статус', 'Дней', 'Срок', 'LOT', 'REF', 'Номенклатура', 'Остаток', 'Производитель'];
    const rows = items.map((i) => [
      i.status,
      i.days,
      i.expiry,
      i.lot,
      i.ref,
      i.name,
      i.qty,
      i.manufacturer,
    ]);
    return '\uFEFF' + toCsv([header, ...rows]);
  }
}
