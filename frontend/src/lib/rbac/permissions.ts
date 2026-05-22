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
  '/lots': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  '/receiving': ['ADMIN', 'MANAGER', 'OPERATOR'],
  '/write-off': ['ADMIN', 'MANAGER', 'OPERATOR'],
  '/movements': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  '/expiry-control': ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  '/recall': ['ADMIN', 'MANAGER'],
  '/settings': ['ADMIN'],
  '/settings/writeoff-destinations': ['ADMIN'],
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

export function canExport(role: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function canReceive(role: UserRole | null): boolean {
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

export function isReadOnly(role: UserRole | null): boolean {
  return role === 'VIEWER';
}
