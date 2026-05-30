import type { PermissionKey } from './permission-catalog';

export type RoutePermissionRule = {
  methods: string[];
  /** Path after global prefix, e.g. `products/:id` or `inventory/receive` */
  pattern: RegExp;
  permission: PermissionKey;
};

/**
 * HTTP route → permission key. When matched, access is decided by resolvePermission
 * (role defaults + per-user overrides), not only by @Roles.
 */
export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  // Dashboard & read-only lists
  { methods: ['GET'], pattern: /^dashboard\/summary$/, permission: 'route.dashboard' },
  { methods: ['GET'], pattern: /^products$/, permission: 'route.products' },
  { methods: ['GET'], pattern: /^products\/[^/]+$/, permission: 'route.products' },
  { methods: ['GET'], pattern: /^product-names/, permission: 'route.product_names' },
  { methods: ['GET'], pattern: /^lots/, permission: 'route.lots' },
  { methods: ['GET'], pattern: /^movements$/, permission: 'route.movements' },
  { methods: ['GET'], pattern: /^expiry/, permission: 'route.expiry' },
  { methods: ['GET'], pattern: /^notifications/, permission: 'route.dashboard' },

  // Products mutate
  { methods: ['POST'], pattern: /^products$/, permission: 'products.create' },
  { methods: ['POST'], pattern: /^products\/quick-create$/, permission: 'products.quick_create' },
  { methods: ['PATCH'], pattern: /^products\/[^/]+$/, permission: 'products.edit' },
  { methods: ['DELETE'], pattern: /^products\/[^/]+$/, permission: 'products.delete_debug' },
  { methods: ['POST'], pattern: /^products\/purge-all$/, permission: 'products.delete_debug' },

  // Product names
  { methods: ['POST'], pattern: /^product-names$/, permission: 'product_names.manage' },
  { methods: ['PATCH'], pattern: /^product-names\/[^/]+$/, permission: 'product_names.manage' },
  { methods: ['DELETE'], pattern: /^product-names\/[^/]+$/, permission: 'product_names.manage' },

  // Product RU
  { methods: ['GET'], pattern: /^product-ru/, permission: 'route.products' },
  { methods: ['POST'], pattern: /^product-ru$/, permission: 'receiving.attach_ru' },
  { methods: ['DELETE'], pattern: /^product-ru\/[^/]+$/, permission: 'receiving.attach_ru' },

  // Lots mutate
  { methods: ['PATCH'], pattern: /^lots\/[^/]+\/status$/, permission: 'expiry.manage_status' },
  { methods: ['PATCH'], pattern: /^lots\/[^/]+\/location$/, permission: 'products.edit' },
  { methods: ['POST'], pattern: /^lots\/[^/]+\/void$/, permission: 'expiry.manage_status' },
  { methods: ['GET'], pattern: /^lots\/recall/, permission: 'recall.manage' },

  // Inventory / receiving / writeoff
  { methods: ['GET'], pattern: /^inventory/, permission: 'route.movements' },
  { methods: ['POST'], pattern: /^inventory\/receive$/, permission: 'route.receiving' },
  { methods: ['POST'], pattern: /^inventory\/writeoff/, permission: 'writeoff.execute' },
  { methods: ['GET'], pattern: /^inventory\/writeoff\/recommendation/, permission: 'writeoff.execute' },

  // Expected receipts
  { methods: ['GET'], pattern: /^expected-receipts/, permission: 'route.receiving' },
  { methods: ['POST'], pattern: /^expected-receipts$/, permission: 'route.receiving' },
  { methods: ['PATCH'], pattern: /^expected-receipts\/[^/]+$/, permission: 'route.receiving' },
  { methods: ['POST'], pattern: /^expected-receipts\/[^/]+\/(close|cancel)$/, permission: 'route.receiving' },
  { methods: ['DELETE'], pattern: /^expected-receipts\/[^/]+$/, permission: 'route.receiving' },

  // Shipments
  { methods: ['GET'], pattern: /^shipments/, permission: 'route.shipments' },
  { methods: ['POST'], pattern: /^shipments$/, permission: 'route.shipments' },
  { methods: ['PATCH'], pattern: /^shipments\/[^/]+/, permission: 'route.shipments' },
  { methods: ['DELETE'], pattern: /^shipments\/[^/]+$/, permission: 'route.shipments' },

  // Counterparties
  { methods: ['GET'], pattern: /^counterparties/, permission: 'route.counterparties' },
  { methods: ['POST'], pattern: /^counterparties/, permission: 'route.counterparties' },
  { methods: ['PATCH'], pattern: /^counterparties/, permission: 'route.counterparties' },
  { methods: ['DELETE'], pattern: /^counterparties/, permission: 'route.counterparties' },
  { methods: ['GET'], pattern: /^contracts/, permission: 'route.counterparties' },
  { methods: ['POST'], pattern: /^contracts/, permission: 'route.counterparties' },
  { methods: ['PATCH'], pattern: /^contracts/, permission: 'route.counterparties' },
  { methods: ['DELETE'], pattern: /^contracts/, permission: 'route.counterparties' },

  // Writeoff destinations
  { methods: ['GET'], pattern: /^writeoff-destinations/, permission: 'writeoff.destinations' },
  { methods: ['POST'], pattern: /^writeoff-destinations$/, permission: 'writeoff.destinations' },
  { methods: ['PATCH'], pattern: /^writeoff-destinations\/[^/]+$/, permission: 'writeoff.destinations' },
  { methods: ['DELETE'], pattern: /^writeoff-destinations\/[^/]+$/, permission: 'writeoff.destinations' },

  // Settings
  { methods: ['GET'], pattern: /^settings$/, permission: 'route.settings' },
  { methods: ['PATCH'], pattern: /^settings$/, permission: 'settings.fefo' },
  { methods: ['GET'], pattern: /^settings\/mail/, permission: 'settings.full' },
  { methods: ['PATCH'], pattern: /^settings\/mail/, permission: 'settings.full' },
  { methods: ['POST'], pattern: /^settings\/mail\/test/, permission: 'settings.full' },

  // Users & audit
  { methods: ['GET'], pattern: /^users$/, permission: 'users.manage' },
  { methods: ['POST'], pattern: /^users$/, permission: 'users.manage' },
  { methods: ['PATCH'], pattern: /^users\/[^/]+$/, permission: 'users.manage' },
  { methods: ['POST'], pattern: /^users\/[^/]+\/reset-password$/, permission: 'users.manage' },
  { methods: ['DELETE'], pattern: /^users\/[^/]+$/, permission: 'users.manage' },
  { methods: ['GET'], pattern: /^role-permissions$/, permission: 'route.dashboard' },
  { methods: ['PUT'], pattern: /^role-permissions\/[^/]+$/, permission: 'users.manage' },
  { methods: ['GET'], pattern: /^audit$/, permission: 'route.audit' },

  // Export
  { methods: ['GET'], pattern: /^export\/products$/, permission: 'products.export' },
  { methods: ['GET'], pattern: /^export\/lots$/, permission: 'products.export' },
  { methods: ['GET'], pattern: /^export\/movements$/, permission: 'products.export' },
  { methods: ['GET'], pattern: /^export\/expiry$/, permission: 'products.export' },
  { methods: ['GET'], pattern: /^export\/shift-report$/, permission: 'shift.report' },

  // Scanner / barcode
  { methods: ['POST'], pattern: /^scanner\/process$/, permission: 'route.terminal' },
  { methods: ['GET'], pattern: /^barcode/, permission: 'route.products' },
];

const SKIP_PATH_PREFIXES = ['auth/', 'health/'];

export function normalizeApiPath(
  rawUrl: string,
  globalPrefix = 'api/v1',
): string {
  const pathOnly = rawUrl.split('?')[0] ?? '';
  const normalized = pathOnly.replace(/^\/+/, '');
  const prefix = globalPrefix.replace(/^\/+|\/+$/g, '');
  if (normalized.startsWith(`${prefix}/`)) {
    return normalized.slice(prefix.length + 1);
  }
  if (normalized === prefix) {
    return '';
  }
  return normalized;
}

export function resolveRoutePermission(
  method: string,
  rawUrl: string,
  globalPrefix = 'api/v1',
): PermissionKey | null {
  const path = normalizeApiPath(rawUrl, globalPrefix);
  if (!path || SKIP_PATH_PREFIXES.some((p) => path.startsWith(p))) {
    return null;
  }
  if (path === 'users/me') {
    return null;
  }

  const verb = method.toUpperCase();
  for (const rule of ROUTE_PERMISSION_RULES) {
    if (!rule.methods.includes(verb)) continue;
    if (rule.pattern.test(path)) {
      return rule.permission;
    }
  }
  return null;
}
