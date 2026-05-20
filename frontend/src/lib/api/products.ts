import type { PaginatedResponse, ProductDetail, ProductListItem } from '../../types/api';
import { apiFetch, buildQuery } from './client';

export type ProductsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  manufacturer?: string;
  lowStock?: boolean;
  hasExpiry?: boolean;
  status?: string;
};

export type CreateProductPayload = {
  sku: string;
  name: string;
  manufacturer?: string;
  barcode?: string;
};

export type UpdateProductPayload = {
  name?: string;
  manufacturer?: string;
  barcode?: string;
};

export function fetchProducts(query: ProductsQuery = {}) {
  return apiFetch<PaginatedResponse<ProductListItem>>(
    `/products${buildQuery(query)}`,
  );
}

export function fetchProduct(id: string) {
  return apiFetch<ProductDetail>(`/products/${id}`);
}

export function createProduct(payload: CreateProductPayload) {
  return apiFetch<ProductDetail>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id: string, payload: UpdateProductPayload) {
  return apiFetch<ProductDetail>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
