import type { PaginatedResponse } from '../../types/api';
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
};

export type ExpiryQuery = {
  page?: number;
  pageSize?: number;
  filter?: 'expired' | 'lt30' | 'lt90' | 'all';
  manufacturer?: string;
  status?: string;
};

export function fetchExpiry(query: ExpiryQuery = {}) {
  return apiFetch<PaginatedResponse<ExpiryListItem>>(`/expiry${buildQuery(query)}`);
}

export function fetchExpirySummary() {
  return apiFetch<ExpirySummary>('/expiry/summary');
}
