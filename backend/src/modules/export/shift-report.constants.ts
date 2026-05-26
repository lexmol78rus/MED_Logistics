import { MovementType } from '@prisma/client';
import { DEFAULT_SYSTEM_SETTINGS } from '../settings/settings.types';

/** Значение по умолчанию, если в настройках склада не задано. */
export const DEFAULT_ACTIVITY_HISTORY_RETENTION_DAYS =
  DEFAULT_SYSTEM_SETTINGS.activityHistoryRetentionDays;

export function activityHistoryRetentionMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

/** Действия аудита, дублирующие строки движений ТМЦ — не включаем в отчёт. */
export const SHIFT_REPORT_EXCLUDED_AUDIT_ACTIONS = [
  'inventory.receive',
  'inventory.writeoff',
  'inventory.writeoff.batch',
] as const;

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  RECEIPT: 'ПРИХОД',
  ISSUE: 'РАСХОД',
  ADJUSTMENT: 'КОРРЕКТИРОВКА',
  QUARANTINE: 'КАРАНТИН',
  UNBLOCK: 'РАЗБЛОКИРОВКА',
  RECALL: 'ОТЗЫВ',
  BLOCK: 'БЛОКИРОВКА',
};
