import type { MovementListItem } from '../../types/api';
import { formatGroupSummary } from './groupMovements';

export function itemHasCorrection(item: MovementListItem): boolean {
  return !!(item.hasCorrections || item.isCorrection || (item.correctionCount ?? 0) > 0);
}

export function getItemCorrectionComment(item: MovementListItem): string | null {
  if (!itemHasCorrection(item)) return null;

  if (item.isCorrection && item.editReason?.trim()) {
    return item.editReason.trim();
  }

  const reason = item.lastCorrection?.reason?.trim();
  if (reason && reason !== '—') return reason;

  return null;
}

export function parseMovementQty(qty: string): number {
  const cleaned = qty.replace(/\s/g, '').replace(/^\+/, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

export function sumGroupUnits(items: MovementListItem[]): number {
  return items.reduce((sum, item) => sum + parseMovementQty(item.qty), 0);
}

export function groupHasCorrections(items: MovementListItem[]): boolean {
  return items.some(
    (item) => item.hasCorrections || item.isCorrection || (item.correctionCount ?? 0) > 0,
  );
}

export function isWriteoffGroup(items: MovementListItem[]): boolean {
  const sample = items[0];
  if (!sample) return false;
  const t = sample.type.toUpperCase();
  return t.startsWith('СПИСАНО') || t.includes('КОРРЕКТИРОВКА СПИСАНИЯ');
}

export function buildGroupDetailHeader(items: MovementListItem[]) {
  const first = items[0];
  const positions = items.length;
  const units = sumGroupUnits(items);
  const corrected = groupHasCorrections(items);
  return {
    title: formatGroupSummary(first, positions),
    documentId: first.id,
    operator: first.user,
    date: first.date,
    destination: first.destination,
    positions,
    units,
    corrected,
  };
}
