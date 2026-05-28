import type { MovementListItem } from '../../types/api';

export type MovementGridRowType = 'single' | 'group-master' | 'group-detail';

export type MovementGridRow = {
  rowId: string;
  rowType: MovementGridRowType;
  movement: MovementListItem;
  groupItems?: MovementListItem[];
  groupKey?: string;
};

function getGroupKey(item: MovementListItem): string {
  if (item.operationGroupId) {
    return `gid:${item.operationGroupId}`;
  }
  return `h:${item.date}|${item.user}|${item.destination ?? ''}|${item.type}`;
}

function groupTitle(type: string): string {
  const upper = type.toUpperCase();
  if (upper.includes('ОТГРУЗКА') && upper.includes('СПИСАНО')) return 'Списание по отгрузке';
  if (upper.includes('СПИСАНО') || type === 'РАСХОД') return 'Списание товаров';
  if (type === 'ПРИХОД' || upper.includes('ОПРИХОД')) return 'Приход товаров';
  if (type === 'КАРАНТИН') return 'Карантин';
  if (type === 'КОРРЕКТИРОВКА') return 'Корректировка';
  return 'Групповая операция';
}

function positionsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} позиция`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} позиции`;
  }
  return `${count} позиций`;
}

export function formatGroupSummary(movement: MovementListItem, count: number): string {
  return `${groupTitle(movement.type)} · ${positionsLabel(count)}`;
}

export function collectGroupFieldText(
  items: MovementListItem[],
  pick: (item: MovementListItem) => string | null | undefined,
): string {
  return items
    .map((item) => pick(item) ?? '')
    .filter(Boolean)
    .join(' ');
}

/** Одно назначение списания на группу (все позиции — в одну больницу). */
export function resolveGroupDestination(items: MovementListItem[]): string | null {
  const seen = new Set<string>();
  for (const item of items) {
    const label = item.destination?.trim();
    if (!label) continue;
    const key = label.toLocaleLowerCase('ru-RU');
    if (seen.has(key)) continue;
    seen.add(key);
    return label;
  }
  return null;
}

export function buildMovementGridRows(
  items: MovementListItem[],
  expandedGroups: ReadonlySet<string>,
): MovementGridRow[] {
  const buckets = new Map<string, MovementListItem[]>();
  const order: string[] = [];

  for (const item of items) {
    const key = getGroupKey(item);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(item);
  }

  const rows: MovementGridRow[] = [];

  for (const key of order) {
    const groupItems = buckets.get(key)!;
    if (groupItems.length === 1) {
      const movement = groupItems[0];
      rows.push({
        rowId: `single:${movement.id}`,
        rowType: 'single',
        movement,
      });
      continue;
    }

    const master = groupItems[0];
    rows.push({
      rowId: `group:${key}`,
      rowType: 'group-master',
      movement: master,
      groupItems,
      groupKey: key,
    });

    if (expandedGroups.has(key)) {
      rows.push({
        rowId: `detail:${key}`,
        rowType: 'group-detail',
        movement: master,
        groupItems,
        groupKey: key,
      });
    }
  }

  return rows;
}

export function isGroupMasterRow(row: MovementGridRow | undefined): boolean {
  return row?.rowType === 'group-master';
}
