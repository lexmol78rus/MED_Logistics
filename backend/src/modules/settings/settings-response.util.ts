import {
  DEFAULT_SYSTEM_SETTINGS,
  type SystemSettingsPayload,
} from './settings.types';

const WAREHOUSE_KEYS: (keyof SystemSettingsPayload)[] = [
  'warehouseName',
  'warehouseCode',
  'fefoEnabled',
  'fefoStrict',
  'expiryWarningDays',
  'expiryCriticalDays',
  'scannerAutoFocus',
  'scannerDebounceMs',
  'scannerSoundEnabled',
  'uiCompactMode',
  'uiShowFefoHints',
  'uiAnimations',
  'uiAutoRefreshDashboard',
  'notificationEnabled',
  'activityHistoryRetentionDays',
];

/** Never expose mail/smtp in GET or PATCH /settings responses. */
export function toWarehouseSettingsResponse(
  raw: Record<string, unknown> | SystemSettingsPayload,
): SystemSettingsPayload {
  const out = { ...DEFAULT_SYSTEM_SETTINGS };
  for (const key of WAREHOUSE_KEYS) {
    if (key in raw && raw[key] !== undefined) {
      (out as Record<string, unknown>)[key] = raw[key];
    }
  }
  return out;
}
