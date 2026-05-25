import { apiBaseUrl } from '../../config/env';
import { apiFetch } from './client';
import { useAuthStore } from '../../stores/authStore';

export type ProductRuDocument = {
  id: string;
  productId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string | null;
  createdAt: string;
};

export function fetchProductRuDocuments(productId: string) {
  return apiFetch<{ items: ProductRuDocument[] }>(`/products/${productId}/ru`);
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers: HeadersInit = {
    ...(init.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(`${apiBaseUrl}${path}`, { ...init, headers });
}

export async function uploadProductRuDocument(productId: string, file: File): Promise<ProductRuDocument> {
  const form = new FormData();
  form.append('file', file);
  form.append('originalName', file.name);
  const response = await authFetch(`/products/${productId}/ru`, {
    method: 'POST',
    body: form,
  });
  const body = (await response.json().catch(() => ({}))) as ProductRuDocument & { message?: string | string[] };
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message || `Ошибка загрузки (${response.status})`);
  }
  return body;
}

export async function fetchProductRuFileBlob(productId: string, certId: string): Promise<Blob> {
  const response = await authFetch(`/products/${productId}/ru/${certId}/file`);
  if (!response.ok) {
    throw new Error(`Не удалось открыть файл (${response.status})`);
  }
  return response.blob();
}

export async function deleteProductRuDocument(productId: string, certId: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/products/${productId}/ru/${certId}`, { method: 'DELETE' });
}
