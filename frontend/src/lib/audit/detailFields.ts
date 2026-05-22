import type { AuditLogItem } from '../api/audit';
import { resolveActionConfig } from './actionConfig';
import { formatAuditDate } from './presentAudit';
import { formatActorLabel, resolveActorDisplay } from './resolveActor';
import type { AuditDetailField, AuditLookups } from './types';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const META_LABELS: Record<string, string> = {
  email: 'Email',
  reason: 'Причина',
  productId: 'ID товара',
  lotNumber: 'LOT',
  quantity: 'Количество',
  orderedQty: 'Заказано',
  expectedReceiptId: 'ID ожидания',
  writeOffDestinationId: 'ID назначения',
  writeOffDestinationLabel: 'Назначение списания',
  writeOffComment: 'Комментарий',
  references: 'Документы',
  lines: 'Строки списания',
  changes: 'Изменения',
  sku: 'REF / SKU',
  name: 'Название',
  barcode: 'Штрихкод',
  role: 'Роль',
  from: 'Было',
  to: 'Стало',
  status: 'Статус',
  expectedLotId: 'Ожидаемая партия',
  actualLotId: 'Фактическая партия',
  count: 'Количество расхождений',
  sample: 'Примеры',
  format: 'Формат',
  host: 'SMTP хост',
  port: 'Порт',
  message: 'Сообщение',
  isActive: 'Активно',
  usageCount: 'Использований',
};

export function buildAuditDetailFields(
  item: AuditLogItem,
  lookups: AuditLookups,
): AuditDetailField[] {
  try {
    return buildAuditDetailFieldsInner(item, lookups);
  } catch (err) {
    console.error('AUDIT DETAIL ERROR', item, err);
    return [
      { label: 'Действие', value: item.action ?? '—' },
      { label: 'ID записи', value: item.id ?? '—', mono: true },
      { label: 'Ошибка', value: 'Не удалось разобрать детали события' },
    ];
  }
}

function buildAuditDetailFieldsInner(
  item: AuditLogItem,
  lookups: AuditLookups,
): AuditDetailField[] {
  const meta = asRecord(item.metadata);
  const config = resolveActionConfig(item.action);
  const fields: AuditDetailField[] = [
    { label: 'Действие', value: config.label },
    { label: 'Дата и время', value: formatAuditDate(item.createdAt) },
    { label: 'Пользователь', value: formatActorLabel(resolveActorDisplay(item, lookups)) },
    { label: 'ID пользователя', value: item.actorId ?? '—', mono: true },
    { label: 'Тип сущности', value: item.entityType },
    { label: 'ID сущности', value: item.entityId ?? '—', mono: true },
    { label: 'ID записи аудита', value: item.id, mono: true },
  ];

  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      fields.push({
        label: META_LABELS[key] ?? key,
        value: formatValue(value),
        mono: key.includes('Id') || key === 'lotNumber' || key === 'sku' || key === 'barcode',
      });
    }
  }

  return fields;
}
