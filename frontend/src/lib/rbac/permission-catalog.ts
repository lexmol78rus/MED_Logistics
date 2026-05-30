export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'ACCOUNTANT' | 'VIEWER';

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

  if (role === 'ADMIN') {
    return { ...ALL_TRUE };
  }

  if (role === 'MANAGER') {
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

  if (role === 'OPERATOR') {
    for (const k of OPERATOR_ROUTES) base[k] = true;
    base['products.quick_create'] = true;
    base['receiving.attach_ru'] = true;
    base['writeoff.execute'] = true;
    base['shift.report'] = true;
    return base;
  }

  if (role === 'ACCOUNTANT') {
    for (const k of VIEWER_ROUTES) base[k] = true;
    base['route.shipments'] = true;
    base['route.counterparties'] = true;
    base['products.export'] = true;
    return base;
  }

  for (const k of VIEWER_ROUTES) base[k] = true;
  return base;
}

export const ROLE_PERMISSION_DEFAULTS: Record<UserRole, Record<PermissionKey, boolean>> = {
  ADMIN: defaultsForRole('ADMIN'),
  MANAGER: defaultsForRole('MANAGER'),
  OPERATOR: defaultsForRole('OPERATOR'),
  ACCOUNTANT: defaultsForRole('ACCOUNTANT'),
  VIEWER: defaultsForRole('VIEWER'),
};

export type BuiltinCategoryPermissions = {
  id: PermissionCategoryId;
  label: string;
  description: string;
  items: { key: PermissionKey; label: string; allowed: boolean }[];
  allowedCount: number;
  totalCount: number;
};

/** Human-readable breakdown of built-in (system) rights for a role. */
export function builtinPermissionsByCategory(role: UserRole): BuiltinCategoryPermissions[] {
  const defaults = ROLE_PERMISSION_DEFAULTS[role];
  return PERMISSION_CATEGORIES.map((cat) => {
    const uniqueKeys = [...new Set(cat.keys)];
    const items = uniqueKeys.map((key) => ({
      key,
      label: PERMISSION_LABELS[key] ?? key,
      allowed: defaults[key] ?? false,
    }));
    const allowedCount = items.filter((i) => i.allowed).length;
    return {
      id: cat.id,
      label: cat.label,
      description: cat.description,
      items,
      allowedCount,
      totalCount: items.length,
    };
  });
}

export function countBuiltinPermissions(role: UserRole): { allowed: number; total: number } {
  const defaults = ROLE_PERMISSION_DEFAULTS[role];
  const allowed = PERMISSION_KEYS.filter((k) => defaults[k]).length;
  return { allowed, total: PERMISSION_KEYS.length };
}

function summarizeAllowedLabels(
  items: { label: string; allowed: boolean }[],
): string {
  const allowed = items.filter((i) => i.allowed).map((i) => i.label);
  if (allowed.length === 0) return 'Нет доступа';
  if (allowed.length === items.length) return 'Всё разрешено';
  if (allowed.length <= 2) return allowed.join(' · ');
  return `${allowed[0]} · ${allowed[1]} +${allowed.length - 2}`;
}

export function categoryBuiltinSummary(
  role: UserRole,
  categoryId: PermissionCategoryId,
): string {
  const cat = builtinPermissionsByCategory(role).find((c) => c.id === categoryId);
  if (!cat) return '';
  return summarizeAllowedLabels(cat.items);
}

export function categoryTemplateSummary(
  role: UserRole,
  categoryId: PermissionCategoryId,
  template: PermissionOverrides | null,
): string {
  const cat = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return '';
  const effective = roleTemplateEffectivePermissions(role, template);
  const uniqueKeys = [...new Set(cat.keys)];
  const items = uniqueKeys.map((key) => ({
    label: PERMISSION_LABELS[key] ?? key,
    allowed: effective[key] ?? false,
  }));
  return summarizeAllowedLabels(items);
}

export type CategoryPermissionItem = {
  key: PermissionKey;
  label: string;
  allowed: boolean;
  systemDefault: boolean;
};

/** Полный список прав раздела с флагами «включено» и «по умолчанию для роли». */
export function categoryPermissionItems(
  role: UserRole,
  categoryId: PermissionCategoryId,
  template: PermissionOverrides | null,
): CategoryPermissionItem[] {
  const cat = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];
  const builtin = ROLE_PERMISSION_DEFAULTS[role];
  const effective = roleTemplateEffectivePermissions(role, template);
  const uniqueKeys = [...new Set(cat.keys)];
  return uniqueKeys.map((key) => ({
    key,
    label: PERMISSION_LABELS[key] ?? key,
    allowed: effective[key] ?? false,
    systemDefault: builtin[key] ?? false,
  }));
}

export type CategoryPermissionDiff = {
  key: PermissionKey;
  label: string;
  system: boolean;
  current: boolean;
};

export function categoryPermissionDiffs(
  role: UserRole,
  categoryId: PermissionCategoryId,
  template: PermissionOverrides | null,
): CategoryPermissionDiff[] {
  const cat = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];
  const builtin = ROLE_PERMISSION_DEFAULTS[role];
  const effective = roleTemplateEffectivePermissions(role, template);
  const uniqueKeys = [...new Set(cat.keys)];
  return uniqueKeys
    .filter((key) => (builtin[key] ?? false) !== (effective[key] ?? false))
    .map((key) => ({
      key,
      label: PERMISSION_LABELS[key] ?? key,
      system: builtin[key] ?? false,
      current: effective[key] ?? false,
    }));
}

export function isCategoryTemplateModified(
  role: UserRole,
  categoryId: PermissionCategoryId,
  template: PermissionOverrides | null,
): boolean {
  return categoryPermissionDiffs(role, categoryId, template).length > 0;
}

export function countModifiedTemplateCategories(
  role: UserRole,
  template: PermissionOverrides | null,
): number {
  return PERMISSION_CATEGORIES.filter((cat) =>
    isCategoryTemplateModified(role, cat.id, template),
  ).length;
}

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
  },
  full: {
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
  },
  deny: {},
};

export const CATEGORY_LEVEL_LABELS: Record<CategoryAccessLevel, string> = {
  inherit: 'По умолчанию',
  view: 'Просмотр',
  operate: 'Операции',
  full: 'Полный',
  deny: 'Закрыто',
};

export const CATEGORY_LEVEL_LABELS_BUILTIN: Record<CategoryAccessLevel, string> = {
  inherit: 'Системные',
  view: 'Просмотр',
  operate: 'Операции',
  full: 'Полный',
  deny: 'Закрыто',
};

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

export function roleTemplateEffectivePermissions(
  role: UserRole,
  roleTemplate?: PermissionOverrides | null,
): Record<PermissionKey, boolean> {
  return mergePermissionLayers(role, roleTemplate, null);
}

export function effectivePermissions(
  role: UserRole,
  roleTemplate?: PermissionOverrides | null,
  userOverrides?: PermissionOverrides | null,
): Record<PermissionKey, boolean> {
  return mergePermissionLayers(role, roleTemplate, userOverrides);
}

export function countPermissionOverrides(overrides?: PermissionOverrides | null): number {
  return overrides ? Object.keys(overrides).length : 0;
}

function sparseOverridesEffective(
  role: UserRole,
  sparse: PermissionOverrides | null | undefined,
  inheritBase: Record<PermissionKey, boolean>,
): Record<PermissionKey, boolean> {
  const eff = { ...inheritBase };
  if (!sparse) return eff;
  for (const key of PERMISSION_KEYS) {
    if (sparse[key] !== undefined) {
      eff[key] = sparse[key]!;
    }
  }
  return eff;
}

export function categoryEffectiveLevel(
  role: UserRole,
  categoryId: PermissionCategoryId,
  sparseOverrides?: PermissionOverrides | null,
  inheritBase?: Record<PermissionKey, boolean>,
): CategoryAccessLevel {
  const cat = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return 'inherit';

  const roleBase = inheritBase ?? ROLE_PERMISSION_DEFAULTS[role];
  const eff = sparseOverridesEffective(role, sparseOverrides, roleBase);
  let hasOverride = false;
  let allMatchBase = true;

  for (const key of cat.keys) {
    if (sparseOverrides && sparseOverrides[key] !== undefined) {
      hasOverride = true;
      if (sparseOverrides[key] !== roleBase[key]) allMatchBase = false;
    }
  }

  if (!hasOverride || allMatchBase) return 'inherit';

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
  inheritBase?: Record<PermissionKey, boolean>,
): PermissionOverrides | null {
  const cat = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return current ?? null;

  const next: PermissionOverrides = { ...(current ?? {}) };
  const roleBase = inheritBase ?? ROLE_PERMISSION_DEFAULTS[role];

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

export function setPermissionOverride(
  role: UserRole,
  current: PermissionOverrides | null | undefined,
  key: PermissionKey,
  value: 'inherit' | boolean,
  _inheritBase?: Record<PermissionKey, boolean>,
): PermissionOverrides | null {
  const next: PermissionOverrides = { ...(current ?? {}) };

  if (value === 'inherit') {
    delete next[key];
  } else {
    next[key] = value;
  }

  return Object.keys(next).length ? next : null;
}

/** Итоговое значение права с учётом личного/шаблонного слоя поверх базы. */
export function resolvePermissionInBase(
  key: PermissionKey,
  sparseOverrides: PermissionOverrides | null | undefined,
  inheritBase: Record<PermissionKey, boolean>,
): boolean {
  if (sparseOverrides && sparseOverrides[key] !== undefined) {
    return sparseOverrides[key]!;
  }
  return inheritBase[key] ?? false;
}

export function permissionOverrideState(
  role: UserRole,
  key: PermissionKey,
  sparseOverrides?: PermissionOverrides | null,
  inheritBase?: Record<PermissionKey, boolean>,
): 'inherit' | 'allow' | 'deny' {
  if (!sparseOverrides || sparseOverrides[key] === undefined) return 'inherit';
  return sparseOverrides[key] ? 'allow' : 'deny';
}
