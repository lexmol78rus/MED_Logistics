import type { MovementListItem, PaginatedResponse } from '../../types/api';
import { apiFetch, buildQuery } from './client';

export type MovementsQuery = {
  page?: number;
  pageSize?: number;
  type?: string;
  productId?: string;
  from?: string;
  to?: string;
  search?: string;
  operator?: string;
};

export function fetchMovements(query: MovementsQuery = {}) {
  return apiFetch<PaginatedResponse<MovementListItem>>(
    `/movements${buildQuery(query)}`,
  );
}
