import { apiFetch, buildQuery } from './client';

export type ProductNameCatalogItem = {
  id: string;
  name: string;
  manufacturer: string | null;
  useCount: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductNamesListResponse = {
  items: ProductNameCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function fetchProductNames(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  return apiFetch<ProductNamesListResponse>(
    `/product-names${buildQuery(params)}`,
  );
}

export function suggestProductNames(q: string, limit = 12) {
  return apiFetch<ProductNameCatalogItem[]>(
    `/product-names/suggest${buildQuery({ q, limit })}`,
  );
}

export function createProductName(payload: { name: string; manufacturer?: string }) {
  return apiFetch<ProductNameCatalogItem>('/product-names', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProductName(
  id: string,
  payload: { name?: string; manufacturer?: string },
) {
  return apiFetch<ProductNameCatalogItem>(`/product-names/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteProductName(id: string) {
  return apiFetch<{ deleted: boolean }>(`/product-names/${id}`, {
    method: 'DELETE',
  });
}
