import type { PaginatedResponse } from '../../types/api';
import { MAX_PAGE_SIZE } from '../pagination';
import { apiFetch, buildQuery } from './client';

export type ExpiryListItem = {
  id: string;
  productId: string;
  lot: string;
  ref: string;
  name: string;
  manufacturer: string | null;
  expiry: string | null;
  days: number | null;
  qty: number;
  status: string;
  lotDbStatus: string;
};

export type ExpirySummary = {
  expired: number;
  lt30: number;
  lt90: number;
  restricted: number;
  total: number;
  critical: number;
};

export type ExpiryQuery = {
  page?: number;
  pageSize?: number;
  filter?: 'expired' | 'lt30' | 'lt90' | 'all' | 'critical';
  manufacturer?: string;
  status?: string;
};

export function fetchExpiry(query: ExpiryQuery = {}) {
  return apiFetch<PaginatedResponse<ExpiryListItem>>(`/expiry${buildQuery(query)}`);
}

/** Loads all matching rows by paging with API-safe pageSize (max 100). */
export async function fetchExpiryAll(
  query: Omit<ExpiryQuery, 'page' | 'pageSize'> = {},
): Promise<PaginatedResponse<ExpiryListItem>> {
  const pageSize = MAX_PAGE_SIZE;
  let page = 1;
  const items: ExpiryListItem[] = [];
  let total = 0;

  const maxPages = 100;
  while (page <= maxPages) {
    const res = await fetchExpiry({ ...query, page, pageSize });
    items.push(...res.items);
    total = res.total;
    if (items.length >= total || res.items.length < pageSize) break;
    page += 1;
  }

  return { items, total, page: 1, pageSize: items.length };
}

export function fetchExpirySummary() {
  return apiFetch<ExpirySummary>('/expiry/summary');
}
