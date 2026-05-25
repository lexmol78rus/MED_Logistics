import type { ProductListItem, ProductLotSummary } from '../../types/api';

export type ProductGridRowType = 'single' | 'group-master' | 'group-detail';

export type ProductGridRow = {
  rowId: string;
  rowType: ProductGridRowType;
  product: ProductListItem;
  groupKey?: string;
};

function lotsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} партия`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} партии`;
  }
  return `${count} партий`;
}

export function formatProductLotsSummary(count: number): string {
  return lotsLabel(count);
}

export function productLotItems(product: ProductListItem): ProductLotSummary[] {
  return product.lotItems ?? [];
}

/** Несколько партий — по счётчику API (не ждём lotItems: поле может отсутствовать на старом бэкенде). */
export function isMultiLotProduct(product: ProductListItem): boolean {
  return product.lots > 1;
}

export function buildProductGridRows(
  products: ProductListItem[],
  expandedGroups: ReadonlySet<string>,
): ProductGridRow[] {
  const rows: ProductGridRow[] = [];

  for (const product of products) {
    if (!isMultiLotProduct(product)) {
      rows.push({
        rowId: `single:${product.id}`,
        rowType: 'single',
        product,
      });
      continue;
    }

    const groupKey = product.id;
    rows.push({
      rowId: `group:${groupKey}`,
      rowType: 'group-master',
      product,
      groupKey,
    });

    if (expandedGroups.has(groupKey)) {
      rows.push({
        rowId: `detail:${groupKey}`,
        rowType: 'group-detail',
        product,
        groupKey,
      });
    }
  }

  return rows;
}

export function isProductGroupMasterRow(row: ProductGridRow | undefined): boolean {
  return row?.rowType === 'group-master';
}
