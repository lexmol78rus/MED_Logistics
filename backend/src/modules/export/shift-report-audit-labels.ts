const STATIC: Record<string, string> = {
  'auth.login': 'Вход в систему',
  'auth.logout': 'Выход из системы',
  'auth.login_failed': 'Ошибка входа',
  PASSWORD_RESET: 'Сброс пароля',
  'user.create': 'Создан пользователь',
  'user.role_change': 'Изменена роль',
  'user.disable': 'Отключён пользователь',
  'user.enable': 'Включён пользователь',
  'user.password_reset': 'Сброс пароля админом',
  USER_DELETE: 'Удалён пользователь',
  'inventory.writeoff.correct': 'Корректировка списания',
  'inventory.fefo.violation': 'Нарушение FEFO',
  'inventory.reconciliation.mismatch': 'Расхождение при сверке',
  'product.create': 'Создан товар',
  'product.quick_create': 'Быстрое создание товара',
  'product.update': 'Изменён товар',
  'product.purge_all': 'Полная очистка номенклатуры',
  'lot.location.update': 'Изменён адрес ячейки',
  'expected_receipt.create': 'Создано ожидание поставки',
  'expected_receipt.update': 'Изменено ожидание поставки',
  'expected_receipt.cancel': 'Отменено ожидание поставки',
  'expected_receipt.close': 'Закрыто ожидание поставки',
  'expected_receipt.delete': 'Удалено ожидание поставки',
  'expected_receipt.receive_link': 'Оприходована ожидаемая поставка',
  'writeoff_destination.create': 'Создано назначение списания',
  'writeoff_destination.update': 'Изменено назначение списания',
  'writeoff_destination.archive': 'Архивировано назначение списания',
  'writeoff_destination.delete': 'Удалено назначение списания',
  'settings.update': 'Изменение настроек',
  MAIL_SETTINGS_UPDATE: 'Изменены настройки почты',
  MAIL_TEST_SUCCESS: 'Тест почты успешен',
  MAIL_TEST_FAILED: 'Тест почты не удался',
  'export.products': 'Экспорт товаров',
  'export.shift_report': 'Сформирован отчёт смены',
  'export.shift_report.admin': 'Отчёт смены сотрудника (админ)',
};

const LOT_STATUS: Record<string, string> = {
  ok: 'Статус партии: OK',
  warning: 'Предупреждение по партии',
  quarantine: 'Карантин партии',
  blocked: 'Блокировка партии',
};

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

/** Складской номер документа (ПЕР-0001 и т.п.) — показываем в колонке «Док. №». */
function looksLikeMovementReference(value: string): boolean {
  return /^(ПЕР|СПИ|КОР|КАР|БЛО|ОТЗ|РАЗ)-\d+/i.test(value.trim());
}

/** Внутренний id (cuid и т.п.) — в PDF не показываем. */
function looksLikeInternalId(value: string): boolean {
  const v = value.trim();
  if (!v || looksLikeMovementReference(v)) return false;
  if (v === 'default' || v === 'batch') return false;
  return /^c[a-z0-9]{10,}$/i.test(v) || (v.length >= 18 && !/\s/.test(v) && !v.includes('@'));
}

export type AuditPdfRowFields = {
  document: string;
  ref: string;
  product: string;
  lot: string;
  qty: string;
  details: string;
};

/** Поля строки PDF для записи журнала аудита (без внутренних id в «Док. №»). */
export function buildAuditPdfRow(
  action: string,
  entityId: string | null | undefined,
  metadata: unknown,
): AuditPdfRowFields {
  const meta = asRecord(metadata);
  const typeLabel = resolveAuditActionLabel(action);
  let details = buildAuditEventDetails(action, metadata);

  let document = '—';
  let ref = '';
  let product = '';
  let lot = '';
  const qty = '';

  if (action === 'auth.login') {
    const email = str(meta?.email);
    details = email ? `Вход: ${email}` : 'Вход в систему';
    return { document: '—', ref, product, lot, qty, details };
  }

  if (action === 'auth.logout') {
    return { document: '—', ref, product, lot, qty, details: 'Выход из системы' };
  }

  if (action === 'auth.login_failed') {
    const email = str(meta?.email);
    const reason = str(meta?.reason);
    details = [email && `Email: ${email}`, reason && `Причина: ${reason}`]
      .filter(Boolean)
      .join(' · ') || 'Ошибка входа';
    return { document: '—', ref, product, lot, qty, details };
  }

  if (
    action === 'settings.update' ||
    action.startsWith('MAIL_') ||
    action.startsWith('export.')
  ) {
    if (action === 'export.shift_report' || action === 'export.shift_report.admin') {
      const from = str(meta?.from);
      const to = str(meta?.to);
      if (from && to) {
        details = `Период: ${from.slice(0, 16)} — ${to.slice(0, 16)}`;
      }
    }
    return { document: '—', ref, product, lot, qty, details: details || typeLabel };
  }

  if (action === 'inventory.writeoff.correct' && meta) {
    const refs = Array.isArray(meta.references)
      ? meta.references.map(str).filter(Boolean)
      : [];
    document = refs.length > 0 ? refs.join(', ') : '—';
    return { document, ref, product, lot, qty, details: details || typeLabel };
  }

  if (action.startsWith('product.')) {
    ref = str(meta?.sku);
    product = str(meta?.name);
    return { document: '—', ref, product, lot, qty, details: details || typeLabel };
  }

  if (action.startsWith('lot.')) {
    ref = str(meta?.productSku);
    lot = str(meta?.lotNumber);
    if (action === 'lot.location.update') {
      const loc = str(meta?.location);
      details = [lot && `LOT ${lot}`, loc && `Ячейка: ${loc}`].filter(Boolean).join(' · ') || details;
    }
    return { document: '—', ref, product, lot, qty, details: details || typeLabel };
  }

  if (
    action.startsWith('user.') ||
    action === 'PASSWORD_RESET' ||
    action === 'USER_DELETE'
  ) {
    const email = str(meta?.email);
    details =
      [
        action === 'user.role_change' &&
          `Роль: ${str(meta?.from)} → ${str(meta?.to)}`,
        email && `Пользователь: ${email}`,
      ]
        .filter(Boolean)
        .join(' · ') || details || typeLabel;
    return { document: '—', ref: email, product, lot, qty, details };
  }

  if (action.startsWith('writeoff_destination.')) {
    product = str(meta?.name);
    return { document: '—', ref, product, lot, qty, details: details || typeLabel };
  }

  if (action === 'inventory.fefo.violation') {
    ref = str(meta?.productSku);
    lot = str(meta?.lotNumber);
    return { document: '—', ref, product, lot, qty, details: details || typeLabel };
  }

  if (entityId && looksLikeMovementReference(entityId)) {
    document = entityId;
  } else if (entityId && !looksLikeInternalId(entityId)) {
    document = entityId;
  }

  return {
    document,
    ref,
    product,
    lot,
    qty,
    details: details || typeLabel,
  };
}

export function resolveAuditActionLabel(action: string): string {
  if (STATIC[action]) return STATIC[action];
  if (action.startsWith('lot.status.')) {
    const status = action.replace('lot.status.', '');
    return LOT_STATUS[status] ?? `Статус партии: ${status}`;
  }
  return action;
}

export function buildAuditEventDetails(
  action: string,
  metadata: unknown,
): string {
  const meta = asRecord(metadata);
  if (!meta) return '';

  if (action === 'inventory.fefo.violation') {
    const lot = str(meta.lotNumber);
    const ref = str(meta.productSku);
    return [ref && `REF ${ref}`, lot && `LOT ${lot}`].filter(Boolean).join(' · ');
  }

  if (action === 'inventory.writeoff.correct') {
    const refs = Array.isArray(meta.references)
      ? meta.references.map(str).filter(Boolean).join(', ')
      : '';
    const reason = str(meta.editReason);
    return [refs && `Док.: ${refs}`, reason && `Причина: ${reason}`]
      .filter(Boolean)
      .join(' · ');
  }

  if (action === 'lot.location.update') {
    const lot = str(meta.lotNumber);
    const loc = str(meta.location);
    return [lot && `LOT ${lot}`, loc && `Ячейка: ${loc}`].filter(Boolean).join(' · ');
  }

  if (action.startsWith('lot.status.')) {
    const lot = str(meta.lotNumber);
    const ref = str(meta.productSku);
    return [ref && `REF ${ref}`, lot && `LOT ${lot}`].filter(Boolean).join(' · ');
  }

  if (action === 'product.update' || action === 'product.create') {
    return str(meta.name) || str(meta.sku);
  }

  const keys = ['name', 'sku', 'lotNumber', 'comment', 'message'];
  for (const key of keys) {
    const v = str(meta[key]);
    if (v) return v;
  }

  return '';
}
