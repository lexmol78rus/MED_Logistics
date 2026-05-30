import { UserRole } from '@prisma/client';

/** Sparse overrides: true = grant, false = deny (relative to role defaults). */
export type PermissionOverrides = Record<string, boolean>;

export const PERMISSION_KEYS = [
  'route.dashboard',
  'route.products',
  'route.product_names',
  'route.lots',
  'route.receiving',
  'route.writeoff',
  'route.movements',
  'route.expiry',
  'route.recall',
  'route.shipments',
  'route.counterparties',
  'route.settings',
  'route.users',
  'route.audit',
  'route.terminal',
  'products.create',
  'products.quick_create',
  'products.edit',
  'products.delete_debug',
  'products.export',
  'product_names.manage',
  'receiving.attach_ru',
  'writeoff.execute',
  'writeoff.edit_groups',
  'writeoff.destinations',
  'expiry.manage_status',
  'recall.manage',
  'settings.full',
  'settings.fefo',
  'settings.shift_report',
  'users.manage',
  'shift.report',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionCategoryId =
  | 'nomenclature'
  | 'warehouse'
  | 'shipments'
  | 'compliance'
  | 'directories'
  | 'administration';

export type CategoryAccessLevel = 'inherit' | 'view' | 'operate' | 'full' | 'deny';

const ALL_TRUE = Object.fromEntries(
  PERMISSION_KEYS.map((k) => [k, true]),
) as Record<PermissionKey, boolean>;

const VIEWER_ROUTES: PermissionKey[] = [
  'route.dashboard',
  'route.products',
  'route.product_names',
  'route.lots',
  'route.movements',
  'route.expiry',
];

const OPERATOR_ROUTES: PermissionKey[] = [
  ...VIEWER_ROUTES,
  'route.receiving',
  'route.writeoff',
  'route.shipments',
  'route.terminal',
];

const MANAGER_ROUTES: PermissionKey[] = [
  ...OPERATOR_ROUTES,
  'route.recall',
  'route.counterparties',
  'route.settings',
];

function defaultsForRole(role: UserRole): Record<PermissionKey, boolean> {
  const base = { ...ALL_TRUE } as Record<PermissionKey, boolean>;
  for (const k of PERMISSION_KEYS) {
    base[k] = false;
  }

  if (role === UserRole.ADMIN) {
    return { ...ALL_TRUE };
  }

  if (role === UserRole.MANAGER) {
    for (const k of MANAGER_ROUTES) base[k] = true;
    base['products.create'] = true;
    base['products.quick_create'] = true;
    base['products.edit'] = true;
    base['products.export'] = true;
    base['product_names.manage'] = true;
    base['receiving.attach_ru'] = true;
    base['writeoff.execute'] = true;
    base['writeoff.edit_groups'] = true;
    base['writeoff.destinations'] = true;
    base['expiry.manage_status'] = true;
    base['recall.manage'] = true;
    base['settings.fefo'] = true;
    base['settings.shift_report'] = true;
    base['shift.report'] = true;
    return base;
  }

  if (role === UserRole.OPERATOR) {
    for (const k of OPERATOR_ROUTES) base[k] = true;
    base['products.quick_create'] = true;
    base['receiving.attach_ru'] = true;
    base['writeoff.execute'] = true;
    base['shift.report'] = true;
    return base;
  }

  if (role === UserRole.ACCOUNTANT) {
    for (const k of VIEWER_ROUTES) base[k] = true;
    base['route.shipments'] = true;
    base['route.counterparties'] = true;
    base['products.export'] = true;
    return base;
  }

  // VIEWER
  for (const k of VIEWER_ROUTES) base[k] = true;
  return base;
}

export const ROLE_PERMISSION_DEFAULTS: Record<UserRole, Record<PermissionKey, boolean>> = {
  [UserRole.ADMIN]: defaultsForRole(UserRole.ADMIN),
  [UserRole.MANAGER]: defaultsForRole(UserRole.MANAGER),
  [UserRole.OPERATOR]: defaultsForRole(UserRole.OPERATOR),
  [UserRole.ACCOUNTANT]: defaultsForRole(UserRole.ACCOUNTANT),
  [UserRole.VIEWER]: defaultsForRole(UserRole.VIEWER),
};

export const PERMISSION_CATEGORIES: {
  id: PermissionCategoryId;
  label: string;
  description: string;
  keys: PermissionKey[];
}[] = [
  {
    id: 'nomenclature',
    label: 'Номенклатура',
    description: 'Товары, карточки, справочник наименований',
    keys: [
      'route.products',
      'route.product_names',
      'products.create',
      'products.quick_create',
      'products.edit',
      'products.delete_debug',
      'products.export',
      'product_names.manage',
    ],
  },
  {
    id: 'warehouse',
    label: 'Складские операции',
    description: 'Приёмка, списание, движения, терминал',
    keys: [
      'route.receiving',
      'route.writeoff',
      'route.movements',
      'route.terminal',
      'receiving.attach_ru',
      'writeoff.execute',
      'writeoff.edit_groups',
      'writeoff.destinations',
      'shift.report',
    ],
  },
  {
    id: 'shipments',
    label: 'Отгрузки',
    description: 'Заказы и комплектация',
    keys: ['route.shipments', 'writeoff.execute'],
  },
  {
    id: 'compliance',
    label: 'Контроль и качество',
    description: 'Партии, сроки годности, отзыв',
    keys: [
      'route.lots',
      'route.expiry',
      'route.recall',
      'expiry.manage_status',
      'recall.manage',
      'products.export',
    ],
  },
  {
    id: 'directories',
    label: 'Справочники',
    description: 'Контрагенты и юрлица',
    keys: ['route.counterparties'],
  },
  {
    id: 'administration',
    label: 'Администрирование',
    description: 'Настройки, пользователи, аудит',
    keys: [
      'route.settings',
      'route.users',
      'route.audit',
      'settings.full',
      'settings.fefo',
      'settings.shift_report',
      'users.manage',
    ],
  },
];

const CATEGORY_LEVEL_VALUES: Record<
  Exclude<CategoryAccessLevel, 'inherit'>,
  Partial<Record<PermissionKey, boolean>>
> = {
  view: {
    'route.dashboard': true,
    'route.products': true,
    'route.product_names': true,
    'route.lots': true,
    'route.movements': true,
    'route.expiry': true,
    'route.shipments': true,
    'route.receiving': true,
    'route.writeoff': true,
    'route.counterparties': true,
    'route.settings': true,
    'products.export': true,
  },
  operate: {
    ...({
      'route.dashboard': true,
      'route.products': true,
      'route.product_names': true,
      'route.lots': true,
      'route.movements': true,
      'route.expiry': true,
      'route.receiving': true,
      'route.writeoff': true,
      'route.shipments': true,
      'route.terminal': true,
      'products.quick_create': true,
      'receiving.attach_ru': true,
      'writeoff.execute': true,
      'shift.report': true,
    } as Partial<Record<PermissionKey, boolean>>),
  },
  full: {
    ...({
      'route.dashboard': true,
      'route.products': true,
      'route.product_names': true,
      'route.lots': true,
      'route.movements': true,
      'route.expiry': true,
      'route.recall': true,
      'route.receiving': true,
      'route.writeoff': true,
      'route.shipments': true,
      'route.terminal': true,
      'route.counterparties': true,
      'route.settings': true,
      'products.create': true,
      'products.quick_create': true,
      'products.edit': true,
      'products.export': true,
      'product_names.manage': true,
      'receiving.attach_ru': true,
      'writeoff.execute': true,
      'writeoff.edit_groups': true,
      'writeoff.destinations': true,
      'expiry.manage_status': true,
      'recall.manage': true,
      'settings.fefo': true,
      'settings.shift_report': true,
      'shift.report': true,
    } as Partial<Record<PermissionKey, boolean>>),
  },
  deny: {},
};

export function isPermissionKey(key: string): key is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(key);
}

export function sanitizePermissionOverrides(
  input: unknown,
): PermissionOverrides | null {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }
  const out: PermissionOverrides = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isPermissionKey(key) || typeof value !== 'boolean') continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

/** Built-in + optional global role template + optional per-user overrides. */
export function mergePermissionLayers(
  role: UserRole,
  roleTemplate?: PermissionOverrides | null,
  userOverrides?: PermissionOverrides | null,
): Record<PermissionKey, boolean> {
  const result = { ...ROLE_PERMISSION_DEFAULTS[role] };
  if (roleTemplate) {
    for (const key of PERMISSION_KEYS) {
      if (roleTemplate[key] !== undefined) {
        result[key] = roleTemplate[key]!;
      }
    }
  }
  if (userOverrides) {
    for (const key of PERMISSION_KEYS) {
      if (userOverrides[key] !== undefined) {
        result[key] = userOverrides[key]!;
      }
    }
  }
  return result;
}

export function resolvePermission(
  role: UserRole,
  key: PermissionKey,
  userOverrides?: PermissionOverrides | null,
  roleTemplate?: PermissionOverrides | null,
): boolean {
  return mergePermissionLayers(role, roleTemplate, userOverrides)[key] ?? false;
}

/** Effective rights for a user (builtin + role template + user overrides). */
export function effectivePermissions(
  role: UserRole,
  roleTemplate?: PermissionOverrides | null,
  userOverrides?: PermissionOverrides | null,
): Record<PermissionKey, boolean> {
  return mergePermissionLayers(role, roleTemplate, userOverrides);
}

export function roleTemplateEffectivePermissions(
  role: UserRole,
  roleTemplate?: PermissionOverrides | null,
): Record<PermissionKey, boolean> {
  return mergePermissionLayers(role, roleTemplate, null);
}

export function categoryEffectiveLevel(
  role: UserRole,
  categoryId: PermissionCategoryId,
  overrides?: PermissionOverrides | null,
): CategoryAccessLevel {
  const cat = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return 'inherit';

  const eff = effectivePermissions(role, overrides);
  const roleBase = ROLE_PERMISSION_DEFAULTS[role];
  let hasOverride = false;
  let allMatchRole = true;

  for (const key of cat.keys) {
    if (overrides && overrides[key] !== undefined) {
      hasOverride = true;
      if (overrides[key] !== roleBase[key]) allMatchRole = false;
    }
    void eff[key];
  }

  if (!hasOverride || allMatchRole) return 'inherit';

  const allGranted = cat.keys.every((k) => eff[k]);
  const allDenied = cat.keys.every((k) => !eff[k]);
  if (allDenied) return 'deny';
  if (allGranted) return 'full';

  const operate = CATEGORY_LEVEL_VALUES.operate;
  const matchesOperate = cat.keys.every((k) => eff[k] === (operate[k] ?? roleBase[k]));
  if (matchesOperate) return 'operate';

  const view = CATEGORY_LEVEL_VALUES.view;
  const matchesView = cat.keys.every((k) => eff[k] === (view[k] ?? false));
  if (matchesView) return 'view';

  return 'inherit';
}

export function applyCategoryLevel(
  role: UserRole,
  categoryId: PermissionCategoryId,
  level: CategoryAccessLevel,
  current?: PermissionOverrides | null,
): PermissionOverrides | null {
  const cat = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return current ?? null;

  const next: PermissionOverrides = { ...(current ?? {}) };
  const roleBase = ROLE_PERMISSION_DEFAULTS[role];

  if (level === 'inherit') {
    for (const key of cat.keys) {
      delete next[key];
    }
  } else {
    const grants = CATEGORY_LEVEL_VALUES[level];
    for (const key of cat.keys) {
      const target = grants[key] ?? false;
      if (target === roleBase[key]) {
        delete next[key];
      } else {
        next[key] = target;
      }
    }
  }

  return Object.keys(next).length ? next : null;
}

export const PERMISSION_LABELS: Partial<Record<PermissionKey, string>> = {
  'route.dashboard': 'Панель управления',
  'route.products': 'Раздел «Товары»',
  'route.product_names': 'Справочник наименований',
  'route.lots': 'Партии',
  'route.receiving': 'Приёмка',
  'route.writeoff': 'Списание',
  'route.movements': 'Движения',
  'route.expiry': 'Сроки годности',
  'route.recall': 'Отзыв',
  'route.shipments': 'Отгрузки',
  'route.counterparties': 'Контрагенты',
  'route.settings': 'Настройки',
  'route.users': 'Пользователи',
  'route.audit': 'Журнал аудита',
  'route.terminal': 'Терминал',
  'products.create': 'Создание товаров',
  'products.quick_create': 'Быстрое создание из приёмки',
  'products.edit': 'Редактирование карточки',
  'products.delete_debug': 'Удаление (отладка)',
  'products.export': 'Экспорт данных',
  'product_names.manage': 'Редактирование справочника наименований',
  'receiving.attach_ru': 'Прикрепление РУ при приёмке',
  'writeoff.execute': 'Проведение списания',
  'writeoff.edit_groups': 'Редактирование групп списания',
  'writeoff.destinations': 'Справочник назначений списания',
  'expiry.manage_status': 'Смена статуса партий (сроки)',
  'recall.manage': 'Управление отзывом',
  'settings.full': 'Полные настройки склада',
  'settings.fefo': 'Настройки FEFO',
  'settings.shift_report': 'Отчёт смены по сотрудникам',
  'users.manage': 'Управление пользователями',
  'shift.report': 'Персональный отчёт смены',
};
