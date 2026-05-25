import type { AuditLogItem } from '../api/audit';
import { CATEGORY_LABELS, resolveActionConfig } from './actionConfig';
import { formatActorLabel, resolveActorDisplay } from './resolveActor';
import type { AuditLookups, EnrichedAuditRow } from './types';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function productLabel(lookups: AuditLookups, productId: string | undefined): string {
  if (!productId) return '';
  const p = lookups.productsById.get(productId);
  if (!p) return '';
  return p.name;
}

function productRef(lookups: AuditLookups, productId: string | undefined): string {
  if (!productId) return '';
  return lookups.productsById.get(productId)?.sku ?? '';
}

function quote(text: string): string {
  const t = text.trim();
  return t ? `«${t}»` : '';
}

const LOGIN_FAIL_REASONS: Record<string, string> = {
  unknown_user: 'неизвестный email',
  disabled: 'учётная запись отключена',
  invalid_password: 'неверный пароль',
};

export function formatAuditDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const date = d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
}

/** @deprecated Use resolveActorDisplay from ./resolveActor */
export function resolveActorLabel(
  item: AuditLogItem,
  lookups: AuditLookups,
): string {
  return formatActorLabel(resolveActorDisplay(item, lookups));
}

export function buildAuditDescription(
  item: AuditLogItem,
  lookups: AuditLookups,
): string {
  const meta = asRecord(item.metadata);
  const action = item.action ?? '';

  if (!action) return 'Нет описания';

  if (action === 'inventory.receive' && meta) {
    const qty = num(meta.quantity);
    const name = productLabel(lookups, str(meta.productId));
    const lot = str(meta.lotNumber);
    const parts = [
      qty != null ? `Оприходовано ${qty} шт` : 'Оприходован товар',
      name ? quote(name) : '',
      lot ? `LOT ${lot}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  }

  if (action === 'inventory.writeoff' && meta) {
    const lines = Array.isArray(meta.lines) ? meta.lines : [];
    const totalQty = lines.reduce((sum, line) => {
      const row = asRecord(line);
      return sum + (num(row?.quantity) ?? 0);
    }, 0);
    const name = productLabel(lookups, item.entityId ?? undefined);
    const dest = str(meta.writeOffDestinationLabel) || str(meta.writeOffDestinationId);
    const comment = str(meta.writeOffComment);
    const refs = Array.isArray(meta.references) ? meta.references.map(str).filter(Boolean) : [];
    const parts = [
      totalQty > 0 ? `Списано ${totalQty} шт` : 'Списание товара',
      name ? quote(name) : '',
      dest ? `→ ${dest}` : '',
      comment ? `Комментарий: ${comment}` : '',
      refs.length ? `Документы: ${refs.join(', ')}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  }

  if (action === 'inventory.writeoff.batch' && meta) {
    const items = Array.isArray(meta.items) ? meta.items : [];
    const lineCount = num(meta.lineCount) ?? items.length;
    const itemCount = num(meta.itemCount) ?? items.length;
    const refs = Array.isArray(meta.references) ? meta.references.map(str).filter(Boolean) : [];
    const parts = [
      `Пакетное списание: ${itemCount} поз., ${lineCount} строк`,
      refs.length ? `Документы: ${refs.join(', ')}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  }

  if (action === 'expected_receipt.create' && meta) {
    const name = productLabel(lookups, str(meta.productId));
    const qty = num(meta.orderedQty);
    return [
      'Создано ожидание поставки:',
      name ? quote(name) : '',
      qty != null ? `${qty} шт` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (action === 'expected_receipt.receive_link' && meta) {
    const name = productLabel(lookups, str(meta.productId));
    const qty = num(meta.quantity);
    return [
      'Оприходована ожидаемая поставка',
      name ? quote(name) : '',
      qty != null ? `${qty} шт` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (action === 'expected_receipt.update' && meta) {
    return 'Изменены параметры ожидания поставки';
  }

  if (action.startsWith('expected_receipt.') && item.entityId) {
    return `Ожидание поставки ${item.entityId.slice(0, 8)}…`;
  }

  if (action === 'auth.login' && meta) {
    const who = resolveActorDisplay(item, lookups).name;
    return `Вход: ${str(meta.email) || who}`;
  }

  if (action === 'auth.login_failed' && meta) {
    const email = str(meta.email);
    const reason = LOGIN_FAIL_REASONS[str(meta.reason)] ?? str(meta.reason);
    return [`Неудачный вход`, email, reason ? `(${reason})` : ''].filter(Boolean).join(': ');
  }

  if (action === 'auth.logout') {
    return 'Выход из системы';
  }

  if (action === 'user.create' && meta) {
    return [`Создан: ${str(meta.email)}`, meta.role ? `Роль: ${str(meta.role)}` : '']
      .filter(Boolean)
      .join('\n');
  }

  if (action === 'user.disable' && meta) {
    return `Отключён: ${str(meta.email)}`;
  }

  if (action === 'user.enable' && meta) {
    return `Включён: ${str(meta.email)}`;
  }

  if (action === 'user.role_change' && meta) {
    return `Роль ${str(meta.email)}: ${str(meta.from)} → ${str(meta.to)}`;
  }

  if (action === 'USER_DELETE' && meta) {
    return `Удалён пользователь: ${str(meta.email)}`;
  }

  if (action.startsWith('product.') && meta) {
    const name = str(meta.name);
    const sku = str(meta.sku);
    const barcode = str(meta.barcode);
    if (action === 'product.update') {
      const newSku = str(meta.newSku);
      const refLine = newSku
        ? `REF ${sku} → ${newSku}`
        : sku
          ? `REF ${sku}`
          : '';
      return [`Изменён товар`, name ? quote(name) : refLine].filter(Boolean).join('\n');
    }
    return [
      action === 'product.quick_create' ? 'Быстро создан товар' : 'Создан товар',
      name ? quote(name) : '',
      sku ? `REF ${sku}` : '',
      barcode ? `Штрихкод ${barcode}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (action.startsWith('lot.status.')) {
    const status = str(meta?.status) || action.split('.').pop() || '';
    return `Статус партии: ${status}`;
  }

  if (action === 'settings.update') {
    return 'Изменены системные настройки склада';
  }

  if (action.startsWith('writeoff_destination.')) {
    return str(meta?.name) ? quote(str(meta.name)) : 'Назначение списания';
  }

  if (action === 'inventory.fefo.violation' && meta) {
    const name = productLabel(lookups, item.entityId ?? undefined);
    return [
      'Списание не по FEFO',
      name ? quote(name) : '',
      meta.expectedLotId ? `Ожидалась партия ${str(meta.expectedLotId).slice(0, 8)}…` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (action === 'inventory.reconciliation.mismatch' && meta) {
    const count = num(meta.count);
    return count != null ? `Обнаружено ${count} расхождений при сверке` : 'Расхождение при сверке остатков';
  }

  if (action === 'export.products' && meta) {
    return `Экспорт каталога (${str(meta.format) || 'csv'})`;
  }

  if (meta) {
    const email = str(meta.email);
    const name = str(meta.name);
    if (email || name) {
      return [email, name ? quote(name) : ''].filter(Boolean).join('\n');
    }
  }

  return resolveActionConfig(action).label;
}

function buildSearchText(
  item: AuditLogItem,
  description: string,
  actor: { name: string; email: string | null },
  lookups: AuditLookups,
): string {
  const meta = asRecord(item.metadata);
  const chunks = [
    item.action,
    item.entityType,
    item.entityId,
    description,
    actor.name,
    actor.email,
    item.actorDisplayName,
    item.actorEmail,
    item.actorId,
    str(meta?.email),
    str(meta?.name),
    str(meta?.sku),
    str(meta?.lotNumber),
    str(meta?.writeOffComment),
    str(meta?.writeOffDestinationLabel),
    productLabel(lookups, str(meta?.productId) || item.entityId || undefined),
    productRef(lookups, str(meta?.productId) || item.entityId || undefined),
  ];
  if (Array.isArray(meta?.references)) {
    chunks.push(...meta.references.map(str));
  }
  if (Array.isArray(meta?.lines)) {
    for (const line of meta.lines) {
      const row = asRecord(line);
      if (row?.lotId) chunks.push(str(row.lotId));
    }
  }
  return chunks.filter(Boolean).join(' ').toLowerCase();
}

export function enrichAuditRow(item: AuditLogItem, lookups: AuditLookups): EnrichedAuditRow {
  try {
    const action = item.action ?? 'unknown';
    const config = resolveActionConfig(action);
    const description = buildAuditDescription(item, lookups) || 'Нет описания';
    const actor = resolveActorDisplay(item, lookups);

    return {
      raw: item,
      category: config.category,
      categoryLabel: CATEGORY_LABELS[config.category] ?? 'Прочее',
      actionLabel: config.label ?? 'Событие',
      description,
      actorName: actor.name,
      actorEmail: actor.email,
      actorLabel: formatActorLabel(actor),
      dateLabel: formatAuditDate(item.createdAt),
      severity: config.severity ?? 'normal',
      searchText: buildSearchText(item, description, actor, lookups),
    };
  } catch (err) {
    console.error('AUDIT ROW ERROR', item, err);
    return {
      raw: item,
      category: 'other',
      categoryLabel: 'Прочее',
      actionLabel: item.action ?? 'Неизвестное событие',
      description: 'Нет описания',
      actorName: 'Система',
      actorEmail: null,
      actorLabel: 'Система',
      dateLabel: formatAuditDate(item.createdAt),
      severity: 'normal',
      searchText: (item.action ?? '').toLowerCase(),
    };
  }
}
