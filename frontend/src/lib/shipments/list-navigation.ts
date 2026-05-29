import type { ShipmentStatus } from '../api/shipments';

export type ShipmentsListNavState = {
  /** Query string for /shipments, e.g. `?q=...&tab=NEW` */
  listSearch?: string;
};

export function parseShipmentsListTab(value: string | null): ShipmentStatus | 'ALL' {
  if (value === 'NEW' || value === 'PICKING' || value === 'PICKED' || value === 'ALL') return value;
  return 'ALL';
}

export function buildShipmentsListSearch(q: string, tab: ShipmentStatus | 'ALL'): string {
  const params = new URLSearchParams();
  const trimmed = q.trim();
  if (trimmed) params.set('q', trimmed);
  if (tab !== 'ALL') params.set('tab', tab);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

/** React Router `search` prop (without leading `?`). */
export function listSearchToRouterSearch(listSearch: string): string {
  return listSearch.startsWith('?') ? listSearch.slice(1) : listSearch;
}
