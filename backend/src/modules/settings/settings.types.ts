export type SystemSettingsPayload = {
  warehouseName: string;
  warehouseCode: string;
  fefoEnabled: boolean;
  fefoStrict: boolean;
  expiryWarningDays: number;
  expiryCriticalDays: number;
  scannerAutoFocus: boolean;
  scannerDebounceMs: number;
  scannerSoundEnabled: boolean;
  uiCompactMode: boolean;
  uiShowFefoHints: boolean;
  uiAnimations: boolean;
  uiAutoRefreshDashboard: boolean;
  notificationEnabled: boolean;
  /** Срок хранения журнала действий пользователей (дней). */
  activityHistoryRetentionDays: number;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsPayload = {
  warehouseName: 'МЕД-ЛОГИСТИКА — Склад №1',
  warehouseCode: 'WH-01',
  fefoEnabled: true,
  fefoStrict: true,
  expiryWarningDays: 90,
  expiryCriticalDays: 30,
  scannerAutoFocus: true,
  scannerDebounceMs: 400,
  scannerSoundEnabled: true,
  uiCompactMode: false,
  uiShowFefoHints: true,
  uiAnimations: true,
  uiAutoRefreshDashboard: false,
  notificationEnabled: true,
  activityHistoryRetentionDays: 90,
};
