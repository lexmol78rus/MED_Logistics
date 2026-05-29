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
  gtin?: string;
};

export type UpdateProductPayload = {
  sku?: string;
  name?: string;
  manufacturer?: string;
  barcode?: string;
  gtin?: string;
};

export type QuickCreateProductPayload = {
  barcode: string;
  name: string;
  sku?: string;
  manufacturer?: string;
  gtin?: string;
};

export type QuickCreateProductResult = ProductDetail & {
  created: boolean;
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

export function quickCreateProduct(payload: QuickCreateProductPayload) {
  return apiFetch<QuickCreateProductResult>('/products/quick-create', {
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

export type DeleteProductResult = {
  deleted: true;
  productId: string;
  sku: string;
  name: string;
  counts: {
    lots: number;
    inventoryRows: number;
    movements: number;
    expectedReceipts: number;
    registrationCertificates: number;
    barcodeRecords: number;
  };
  forced: boolean;
};

export function deleteProduct(id: string, options?: { force?: boolean }) {
  const force = options?.force ? '1' : '0';
  return apiFetch<DeleteProductResult>(`/products/${id}?force=${force}`, {
    method: 'DELETE',
  });
}
