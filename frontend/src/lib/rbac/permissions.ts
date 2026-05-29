export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  OPERATOR: 'Оператор склада',
  VIEWER: 'Наблюдатель',
};

export const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  ADMIN: 'bg-violet-100 text-violet-800 border-violet-200',
  MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
  OPERATOR: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  VIEWER: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** Routes allowed per role */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/dashboard': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  '/products': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  '/product-names': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  '/lots': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  '/receiving': ['ADMIN', 'MANAGER', 'OPERATOR'],
  '/write-off': ['ADMIN', 'MANAGER', 'OPERATOR'],
  '/movements': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  '/expiry-control': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  '/recall': ['ADMIN', 'MANAGER'],
  '/shipments': ['ADMIN', 'MANAGER', 'OPERATOR'],
  '/counterparties/customers': ['ADMIN', 'MANAGER'],
  '/counterparties/suppliers': ['ADMIN', 'MANAGER'],
  '/counterparties/legal-entities': ['ADMIN', 'MANAGER'],
  '/settings': ['ADMIN', 'MANAGER'],
  '/settings/writeoff-destinations': ['ADMIN', 'MANAGER'],
  '/users': ['ADMIN'],
  '/audit': ['ADMIN'],
  '/terminal': ['ADMIN', 'MANAGER', 'OPERATOR'],
};

export function canAccessRoute(role: UserRole | null, path: string): boolean {
  if (!role) return false;
  const base = path.split('?')[0];
  if (base.startsWith('/products/')) {
    return ROUTE_ACCESS['/products']?.includes(role) ?? false;
  }
  if (base.startsWith('/shipments/')) {
    return ROUTE_ACCESS['/shipments']?.includes(role) ?? false;
  }
  const allowed = ROUTE_ACCESS[base];
  if (!allowed) return true;
  return allowed.includes(role);
}

export function canCreateProduct(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

/** Быстрое создание товара прямо из приёмки (в т.ч. для оператора) */
export function canQuickCreateProduct(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';
}

export function canEditProduct(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

/** Debug-only: allow hard delete of products in nomenclature. */
export function canDeleteProductDebug(role: UserRole | null): boolean {
  return role === 'ADMIN';
}

export function canExport(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

/** Персональный отчёт смены (PDF) — для сотрудников склада и руководства. */
export function canShiftReport(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';
}

export function canReceive(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';
}

/** Прикрепление РУ на экране приёмки (кладовщик и руководство). */
export function canAttachProductRu(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';
}

export function canWriteoff(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';
}

export function canEditWriteoffGroup(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function canManageLotStatus(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function canRecall(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function canManageUsers(role: UserRole | null): boolean {
  return role === 'ADMIN';
}

/** Страница настроек: полный доступ (почта, сканер, архив и т.д.). */
export function canManageFullWarehouseSettings(role: UserRole | null): boolean {
  return role === 'ADMIN';
}

/** Отчёт смены по выбранному сотруднику (блок в настройках). */
export function canAdminShiftReport(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

/** Справочник назначений списания. */
export function canManageWriteoffDestinations(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

/** База наименований товаров (редактирование / удаление). */
export function canManageProductNames(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

/** FEFO и пороги сроков годности. */
export function canEditFefoSettings(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function isReadOnly(role: UserRole | null): boolean {
  return role === 'VIEWER';
}
