export type WarehouseSettings = {
  warehouseName: string;
  warehouseCode: string;
  fefoEnabled: boolean;
  fefoStrict: boolean;
  expiryWarningDays: number;
  expiryCriticalDays: number;
  scannerAutoFocus: boolean;
  scannerDebounceMs: number;
  scannerSoundEnabled?: boolean;
  notificationEnabled?: boolean;
  uiCompactMode: boolean;
  uiShowFefoHints: boolean;
  uiAnimations: boolean;
  uiAutoRefreshDashboard: boolean;
};

/** Legacy keys that must never be PATCHed to /settings (mail uses /settings/mail). */
export const LEGACY_SETTINGS_KEYS = [
  'mail',
  'smtp',
  'email',
  'notifications',
  'passwordEnc',
] as const;

const WAREHOUSE_SETTINGS_KEYS: (keyof WarehouseSettings)[] = [
  'warehouseName',
  'warehouseCode',
  'fefoEnabled',
  'fefoStrict',
  'expiryWarningDays',
  'expiryCriticalDays',
  'scannerAutoFocus',
  'scannerDebounceMs',
  'scannerSoundEnabled',
  'notificationEnabled',
  'uiCompactMode',
  'uiShowFefoHints',
  'uiAnimations',
  'uiAutoRefreshDashboard',
];

const STORAGE_KEY = 'med-warehouse-settings';
const STORAGE_VERSION_KEY = 'med-warehouse-settings:v';
const CURRENT_STORAGE_VERSION = 2;

/** Old / alternate localStorage keys from earlier builds. */
const LEGACY_STORAGE_KEYS = [
  'med-settings',
  'med-warehouse-settings-v1',
  'warehouse-settings',
] as const;

export const DEFAULT_SETTINGS: WarehouseSettings = {
  warehouseName: 'МЕД-ЛОГИСТИКА — Склад №1',
  warehouseCode: 'WH-01',
  fefoEnabled: true,
  fefoStrict: true,
  expiryWarningDays: 90,
  expiryCriticalDays: 30,
  scannerAutoFocus: true,
  scannerDebounceMs: 400,
  scannerSoundEnabled: true,
  notificationEnabled: true,
  uiCompactMode: false,
  uiShowFefoHints: true,
  uiAnimations: true,
  uiAutoRefreshDashboard: false,
};

export function stripLegacySettingsKeys<T extends Record<string, unknown>>(raw: T): T {
  const out = { ...raw };
  for (const key of LEGACY_SETTINGS_KEYS) {
    delete out[key];
  }
  return out;
}

/** Whitelist-only merge into WarehouseSettings (no spread of unknown keys). */
export function pickWarehouseSettings(
  raw: Partial<WarehouseSettings> & Record<string, unknown>,
): WarehouseSettings {
  const cleaned = stripLegacySettingsKeys(raw);
  const picked = { ...DEFAULT_SETTINGS };
  for (const key of WAREHOUSE_SETTINGS_KEYS) {
    if (key in cleaned && cleaned[key] !== undefined) {
      (picked as Record<string, unknown>)[key] = cleaned[key];
    }
  }
  return picked;
}

/** Explicit PATCH body — only whitelisted fields, never legacy keys. */
export function buildSettingsPatchPayload(
  raw: Partial<WarehouseSettings> & Record<string, unknown>,
): WarehouseSettings {
  const s = pickWarehouseSettings(raw);
  return {
    warehouseName: s.warehouseName,
    warehouseCode: s.warehouseCode,
    fefoEnabled: s.fefoEnabled,
    fefoStrict: s.fefoStrict,
    expiryWarningDays: s.expiryWarningDays,
    expiryCriticalDays: s.expiryCriticalDays,
    scannerAutoFocus: s.scannerAutoFocus,
    scannerDebounceMs: s.scannerDebounceMs,
    scannerSoundEnabled: s.scannerSoundEnabled,
    notificationEnabled: s.notificationEnabled,
    uiCompactMode: s.uiCompactMode,
    uiShowFefoHints: s.uiShowFefoHints,
    uiAnimations: s.uiAnimations,
    uiAutoRefreshDashboard: s.uiAutoRefreshDashboard,
  };
}

function readLegacyStorageBlob(): Record<string, unknown> | null {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        localStorage.removeItem(key);
        return parsed;
      }
    } catch {
      localStorage.removeItem(key);
    }
  }
  return null;
}

/** One-time cleanup: rewrite localStorage without legacy nested mail/smtp. */
export function migrateSettingsStorage(): void {
  try {
    const legacyBlob = readLegacyStorageBlob();
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, unknown>)
      : legacyBlob ?? null;

    if (!parsed || typeof parsed !== 'object') {
      if (legacyBlob) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pickWarehouseSettings(legacyBlob)));
      }
      localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
      return;
    }

    const hasLegacy = LEGACY_SETTINGS_KEYS.some((k) => k in parsed);
    const version = Number(localStorage.getItem(STORAGE_VERSION_KEY) ?? 0);
    if (!hasLegacy && version >= CURRENT_STORAGE_VERSION && !legacyBlob) {
      return;
    }

    const merged = legacyBlob ? { ...legacyBlob, ...parsed } : parsed;
    const cleaned = pickWarehouseSettings(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
  }
}

export function loadSettings(): WarehouseSettings {
  migrateSettingsStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return pickWarehouseSettings(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: WarehouseSettings): void {
  const cleaned = buildSettingsPatchPayload(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
}

export function assertPatchPayloadClean(payload: Record<string, unknown>): void {
  const leaked = LEGACY_SETTINGS_KEYS.filter((k) => k in payload);
  if (leaked.length > 0) {
    console.error('[settings] PATCH payload contains legacy keys:', leaked, payload);
    throw new Error(`PATCH payload must not include: ${leaked.join(', ')}`);
  }
}

// Run migration as soon as the module loads (before any React state hydrate).
migrateSettingsStorage();
