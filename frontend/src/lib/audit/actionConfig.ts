import type { AuditCategory, AuditSeverity } from './types';

export type ActionConfig = {
  label: string;
  category: AuditCategory;
  severity: AuditSeverity;
};

const STATIC: Record<string, ActionConfig> = {
  'auth.login': { label: 'Вход в систему', category: 'login', severity: 'normal' },
  'auth.logout': { label: 'Выход из системы', category: 'login', severity: 'normal' },
  'auth.login_failed': { label: 'Ошибка входа', category: 'errors', severity: 'danger' },
  PASSWORD_RESET: { label: 'Сброс пароля', category: 'users', severity: 'warning' },

  'user.create': { label: 'Создан пользователь', category: 'users', severity: 'normal' },
  'user.role_change': { label: 'Изменена роль', category: 'users', severity: 'warning' },
  'user.disable': { label: 'Отключён пользователь', category: 'users', severity: 'danger' },
  'user.enable': { label: 'Включён пользователь', category: 'users', severity: 'normal' },
  'user.password_reset': { label: 'Сброс пароля админом', category: 'users', severity: 'warning' },
  USER_DELETE: { label: 'Удалён пользователь', category: 'users', severity: 'danger' },

  'inventory.receive': { label: 'Приёмка товара', category: 'receive', severity: 'normal' },
  'inventory.writeoff': { label: 'Списание товара', category: 'writeoff', severity: 'warning' },
  'inventory.writeoff.batch': {
    label: 'Пакетное списание',
    category: 'writeoff',
    severity: 'warning',
  },
  'inventory.fefo.violation': { label: 'Нарушение FEFO', category: 'writeoff', severity: 'warning' },
  'inventory.reconciliation.mismatch': {
    label: 'Расхождение при сверке',
    category: 'other',
    severity: 'warning',
  },

  'product.create': { label: 'Создан товар', category: 'products', severity: 'normal' },
  'product.quick_create': { label: 'Быстрое создание товара', category: 'products', severity: 'normal' },
  'product.update': { label: 'Изменён товар', category: 'products', severity: 'normal' },

  'expected_receipt.create': {
    label: 'Создано ожидание поставки',
    category: 'expected_receipt',
    severity: 'normal',
  },
  'expected_receipt.update': {
    label: 'Изменено ожидание поставки',
    category: 'expected_receipt',
    severity: 'normal',
  },
  'expected_receipt.cancel': {
    label: 'Отменено ожидание поставки',
    category: 'expected_receipt',
    severity: 'warning',
  },
  'expected_receipt.close': {
    label: 'Закрыто ожидание поставки',
    category: 'expected_receipt',
    severity: 'normal',
  },
  'expected_receipt.delete': {
    label: 'Удалено ожидание поставки',
    category: 'expected_receipt',
    severity: 'danger',
  },
  'expected_receipt.receive_link': {
    label: 'Оприходована ожидаемая поставка',
    category: 'expected_receipt',
    severity: 'normal',
  },

  'writeoff_destination.create': {
    label: 'Создано назначение списания',
    category: 'settings',
    severity: 'normal',
  },
  'writeoff_destination.update': {
    label: 'Изменено назначение списания',
    category: 'settings',
    severity: 'normal',
  },
  'writeoff_destination.archive': {
    label: 'Архивировано назначение списания',
    category: 'settings',
    severity: 'warning',
  },
  'writeoff_destination.delete': {
    label: 'Удалено назначение списания',
    category: 'settings',
    severity: 'danger',
  },

  'settings.update': { label: 'Изменение настроек', category: 'settings', severity: 'warning' },
  MAIL_SETTINGS_UPDATE: { label: 'Изменены настройки почты', category: 'settings', severity: 'normal' },
  MAIL_TEST_SUCCESS: { label: 'Тест почты успешен', category: 'settings', severity: 'normal' },
  MAIL_TEST_FAILED: { label: 'Тест почты не удался', category: 'settings', severity: 'warning' },

  'export.products': { label: 'Экспорт товаров', category: 'other', severity: 'normal' },
  'export.shift_report': { label: 'Отчёт смены (PDF)', category: 'other', severity: 'normal' },
  'export.shift_report.admin': {
    label: 'Отчёт смены сотрудника (админ)',
    category: 'other',
    severity: 'warning',
  },
};

const LOT_STATUS: Record<string, ActionConfig> = {
  ok: { label: 'Статус партии: OK', category: 'block', severity: 'normal' },
  warning: { label: 'Предупреждение по партии', category: 'block', severity: 'warning' },
  quarantine: { label: 'Карантин партии', category: 'block', severity: 'warning' },
  blocked: { label: 'Блокировка партии', category: 'block', severity: 'danger' },
};

export const CATEGORY_FILTERS: { id: AuditCategory; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'login', label: 'Входы' },
  { id: 'receive', label: 'Приёмка' },
  { id: 'writeoff', label: 'Списания' },
  { id: 'block', label: 'Блокировки' },
  { id: 'users', label: 'Пользователи' },
  { id: 'settings', label: 'Настройки' },
  { id: 'expected_receipt', label: 'Ожидания' },
  { id: 'errors', label: 'Ошибки' },
];

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  all: 'Все',
  login: 'Вход',
  receive: 'Приёмка',
  writeoff: 'Списание',
  block: 'Блокировка',
  users: 'Пользователи',
  settings: 'Настройки',
  expected_receipt: 'Ожидание',
  products: 'Товар',
  errors: 'Ошибка',
  other: 'Прочее',
};

export function resolveActionConfig(action: string | null | undefined): ActionConfig {
  const key = (action ?? '').trim();
  if (!key) {
    return { label: 'Неизвестное событие', category: 'other', severity: 'normal' };
  }
  if (STATIC[key]) return STATIC[key];

  const lotMatch = /^lot\.status\.(\w+)$/.exec(key);
  if (lotMatch) {
    const status = lotMatch[1].toLowerCase();
    if (LOT_STATUS[status]) return LOT_STATUS[status];
    return {
      label: `Статус партии: ${status.toUpperCase()}`,
      category: 'block',
      severity: status === 'blocked' ? 'danger' : 'warning',
    };
  }

  const humanized = key
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: humanized, category: 'other', severity: 'normal' };
}

export function matchesCategoryFilter(
  action: string | null | undefined,
  category: AuditCategory,
): boolean {
  if (category === 'all') return true;
  return resolveActionConfig(action).category === category;
}
