import type { LotListItem, PaginatedResponse } from '../../types/api';
import { apiFetch, buildQuery } from './client';

export type LotsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  fefo?: boolean;
  productId?: string;
  status?: string;
  expiryWindow?: string;
  quarantined?: boolean;
  blocked?: boolean;
};

export type LotStatusPayload = {
  status: 'OK' | 'WARNING' | 'QUARANTINE' | 'BLOCKED';
  recall?: boolean;
};

export function fetchLots(query: LotsQuery = {}) {
  return apiFetch<PaginatedResponse<LotListItem>>(`/lots${buildQuery(query)}`);
}

export function updateLotStatus(id: string, payload: LotStatusPayload) {
  return apiFetch<LotListItem>(`/lots/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateLotLocation(
  id: string,
  payload: { location?: string | null },
) {
  return apiFetch<LotListItem>(`/lots/${id}/location`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
