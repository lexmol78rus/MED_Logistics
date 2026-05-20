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

const STORAGE_KEY = 'med-warehouse-settings';

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

export function loadSettings(): WarehouseSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: WarehouseSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
