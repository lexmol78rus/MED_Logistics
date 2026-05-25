import type { MovementListItem } from '../../types/api';
import { formatGroupSummary, resolveGroupDestination } from './groupMovements';

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
  const displayRows = buildGroupDetailDisplayRows(items);
  const positions = displayRows.length;
  const units = sumGroupUnits(items);
  const corrected = groupHasCorrections(items);
  return {
    title: formatGroupSummary(first, positions),
    documentId: first.id,
    operator: first.user,
    date: first.date,
    destination: resolveGroupDestination(items),
    positions,
    units,
    corrected,
  };
}

export function isCorrectionLine(item: MovementListItem): boolean {
  if (item.isCorrection) return true;
  return item.type.toUpperCase().includes('КОРРЕКТИРОВКА СПИСАНИЯ');
}

export function isRootWriteoffLine(item: MovementListItem): boolean {
  if (isCorrectionLine(item)) return false;
  const upper = item.type.toUpperCase();
  return upper.startsWith('СПИСАНО') || upper === 'РАСХОД';
}

export function movementLineKey(item: MovementListItem): string {
  const expiry = item.expiryDate?.slice(0, 10) ?? '';
  return `${item.ref}\0${item.lot ?? ''}\0${expiry}`;
}

export type GroupDetailDisplayRow =
  | { kind: 'single'; item: MovementListItem }
  | { kind: 'merged'; root: MovementListItem; corrections: MovementListItem[] };

/** Списание + корректировки по той же партии — одна карточка в раскрытой группе. */
export function buildGroupDetailDisplayRows(items: MovementListItem[]): GroupDetailDisplayRow[] {
  const correctionByKey = new Map<string, MovementListItem[]>();

  for (const item of items) {
    if (!isCorrectionLine(item)) continue;
    const key = movementLineKey(item);
    const bucket = correctionByKey.get(key);
    if (bucket) bucket.push(item);
    else correctionByKey.set(key, [item]);
  }

  const hiddenCorrectionIds = new Set<string>();
  for (const corrections of correctionByKey.values()) {
    const hasRoot = items.some(
      (item) => isRootWriteoffLine(item) && movementLineKey(item) === movementLineKey(corrections[0]!),
    );
    if (hasRoot) {
      for (const c of corrections) hiddenCorrectionIds.add(c.id);
    }
  }

  const rows: GroupDetailDisplayRow[] = [];
  const emittedMergedKeys = new Set<string>();

  for (const item of items) {
    if (hiddenCorrectionIds.has(item.id)) continue;

    if (isRootWriteoffLine(item)) {
      const key = movementLineKey(item);
      const corrections = correctionByKey.get(key) ?? [];
      if (corrections.length > 0 && !emittedMergedKeys.has(key)) {
        emittedMergedKeys.add(key);
        rows.push({ kind: 'merged', root: item, corrections });
        continue;
      }
    }

    rows.push({ kind: 'single', item });
  }

  return rows;
}

export type MergedWriteoffQtyDisplay = {
  primary: string;
  correctionPart: string | null;
  effectivePart: string | null;
  title: string;
};

export function formatMergedWriteoffQtyDisplay(
  root: MovementListItem,
  corrections: MovementListItem[],
): MergedWriteoffQtyDisplay {
  const correctionPart =
    corrections.length > 0
      ? `(${corrections.map((c) => c.qty).join(', ')})`
      : null;

  let effectivePart: string | null = null;
  if (root.effectiveWriteoffQty != null && corrections.length > 0) {
    effectivePart = `−${root.effectiveWriteoffQty.toLocaleString('ru-RU')}`;
  }

  const titleParts: string[] = [];
  if (effectivePart) titleParts.push(`Итого списано: ${effectivePart}`);
  titleParts.push(`Первоначально: ${root.qty}`);
  for (const c of corrections) {
    titleParts.push(`Корректировка: ${c.qty}`);
  }

  return {
    primary: root.qty,
    correctionPart,
    effectivePart,
    title: titleParts.join('\n'),
  };
}

export function getMergedDisplayCorrectionComment(
  root: MovementListItem,
  corrections: MovementListItem[],
): string | null {
  const rootComment = getItemCorrectionComment(root);
  const correctionComments = corrections
    .map((c) => getItemCorrectionComment(c))
    .filter((c): c is string => !!c);

  const unique = [...new Set([rootComment, ...correctionComments].filter((c): c is string => !!c))];
  if (unique.length === 0) return null;
  return unique.join(' · ');
}
