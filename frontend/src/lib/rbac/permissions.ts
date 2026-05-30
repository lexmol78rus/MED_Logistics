import { useRoleTemplatesStore } from '../../stores/roleTemplatesStore';
import { useUserStore } from '../../stores/userStore';
import {
  resolvePermission,
  type PermissionKey,
  type PermissionOverrides,
  type UserRole,
} from './permission-catalog';

export type { PermissionOverrides, PermissionKey, UserRole };

/** Порядок ролей в селектах (от более привилегированной к ограниченной). */
export const USER_ROLES: UserRole[] = [
  'ADMIN',
  'MANAGER',
  'OPERATOR',
  'ACCOUNTANT',
  'VIEWER',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  OPERATOR: 'Оператор склада',
  ACCOUNTANT: 'Бухгалтер',
  VIEWER: 'Наблюдатель',
};

export const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  ADMIN: 'bg-violet-100 text-violet-800 border-violet-200',
  MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
  OPERATOR: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ACCOUNTANT: 'bg-amber-100 text-amber-900 border-amber-200',
  VIEWER: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ROUTE_PERMISSION: Record<string, PermissionKey> = {
  '/dashboard': 'route.dashboard',
  '/products': 'route.products',
  '/product-names': 'route.product_names',
  '/lots': 'route.lots',
  '/receiving': 'route.receiving',
  '/write-off': 'route.writeoff',
  '/movements': 'route.movements',
  '/expiry-control': 'route.expiry',
  '/recall': 'route.recall',
  '/shipments': 'route.shipments',
  '/counterparties/customers': 'route.counterparties',
  '/counterparties/suppliers': 'route.counterparties',
  '/counterparties/legal-entities': 'route.counterparties',
  '/settings': 'route.settings',
  '/settings/writeoff-destinations': 'route.settings',
  '/settings/access': 'route.settings',
  '/users': 'route.users',
  '/audit': 'route.audit',
  '/terminal': 'route.terminal',
};

/** Routes allowed per role (fallback for unknown paths; prefer permission keys). */
const READ_WITH_ACCOUNTANT: UserRole[] = [
  'ADMIN',
  'MANAGER',
  'OPERATOR',
  'ACCOUNTANT',
  'VIEWER',
];

export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/dashboard': READ_WITH_ACCOUNTANT,
  '/products': READ_WITH_ACCOUNTANT,
  '/product-names': READ_WITH_ACCOUNTANT,
  '/lots': READ_WITH_ACCOUNTANT,
  '/receiving': ['ADMIN', 'MANAGER', 'OPERATOR'],
  '/write-off': ['ADMIN', 'MANAGER', 'OPERATOR'],
  '/movements': READ_WITH_ACCOUNTANT,
  '/expiry-control': READ_WITH_ACCOUNTANT,
  '/recall': ['ADMIN', 'MANAGER'],
  '/shipments': ['ADMIN', 'MANAGER', 'OPERATOR', 'ACCOUNTANT'],
  '/counterparties/customers': ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/counterparties/suppliers': ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/counterparties/legal-entities': ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/settings': ['ADMIN', 'MANAGER'],
  '/settings/writeoff-destinations': ['ADMIN', 'MANAGER'],
  '/settings/access': ['ADMIN'],
  '/users': ['ADMIN'],
  '/audit': ['ADMIN'],
  '/terminal': ['ADMIN', 'MANAGER', 'OPERATOR'],
};

function getUserOverrides(): PermissionOverrides | null {
  return useUserStore.getState().user?.permissions ?? null;
}

function getRoleTemplate(role: UserRole | null): PermissionOverrides | null {
  if (!role) return null;
  return useRoleTemplatesStore.getState().templates?.[role] ?? null;
}

function perm(role: UserRole | null, key: PermissionKey): boolean {
  if (!role) return false;
  return resolvePermission(role, key, getUserOverrides(), getRoleTemplate(role));
}

export function canAccessRoute(role: UserRole | null, path: string): boolean {
  if (!role) return false;
  const base = path.split('?')[0];
  if (base.startsWith('/products/')) {
    return perm(role, 'route.products');
  }
  if (base.startsWith('/shipments/')) {
    return perm(role, 'route.shipments');
  }
  if (base.startsWith('/settings/')) {
    if (base === '/settings/access') {
      return perm(role, 'users.manage');
    }
    return perm(role, 'route.settings');
  }
  const key = ROUTE_PERMISSION[base];
  if (key) {
    return perm(role, key);
  }
  const allowed = ROUTE_ACCESS[base];
  if (!allowed) return true;
  return allowed.includes(role);
}

export function canManageAccessSettings(role: UserRole | null): boolean {
  return perm(role, 'users.manage');
}

export function canCreateProduct(role: UserRole | null): boolean {
  return perm(role, 'products.create');
}

export function canQuickCreateProduct(role: UserRole | null): boolean {
  return perm(role, 'products.quick_create');
}

export function canEditProduct(role: UserRole | null): boolean {
  return perm(role, 'products.edit');
}

export function canDeleteProductDebug(role: UserRole | null): boolean {
  return perm(role, 'products.delete_debug');
}

export function canExport(role: UserRole | null): boolean {
  return perm(role, 'products.export');
}

export function canShiftReport(role: UserRole | null): boolean {
  return perm(role, 'shift.report');
}

export function canReceive(role: UserRole | null): boolean {
  return perm(role, 'route.receiving');
}

export function canAttachProductRu(role: UserRole | null): boolean {
  return perm(role, 'receiving.attach_ru');
}

export function canWriteoff(role: UserRole | null): boolean {
  return perm(role, 'writeoff.execute');
}

export function canEditWriteoffGroup(role: UserRole | null): boolean {
  return perm(role, 'writeoff.edit_groups');
}

export function canManageLotStatus(role: UserRole | null): boolean {
  return perm(role, 'expiry.manage_status');
}

export function canRecall(role: UserRole | null): boolean {
  return perm(role, 'recall.manage');
}

export function canManageUsers(role: UserRole | null): boolean {
  return canManageAccessSettings(role);
}

export function canManageFullWarehouseSettings(role: UserRole | null): boolean {
  return perm(role, 'settings.full');
}

export function canAdminShiftReport(role: UserRole | null): boolean {
  return perm(role, 'settings.shift_report');
}

export function canManageWriteoffDestinations(role: UserRole | null): boolean {
  return perm(role, 'writeoff.destinations');
}

export function canManageProductNames(role: UserRole | null): boolean {
  return perm(role, 'product_names.manage');
}

export function canEditFefoSettings(role: UserRole | null): boolean {
  return perm(role, 'settings.fefo');
}

export function isReadOnly(role: UserRole | null): boolean {
  if (!role) return true;
  return (
    !perm(role, 'products.edit') &&
    !perm(role, 'writeoff.execute') &&
    !perm(role, 'products.create')
  );
}
