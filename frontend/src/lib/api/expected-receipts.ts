import { apiFetch, buildQuery } from './client';

export type ExpectedReceiptStatus =
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type ExpectedReceiptEvent = {
  id: string;
  type: string;
  typeLabel: string;
  quantity: number | null;
  message: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export type ExpectedReceipt = {
  id: string;
  productId: string;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  status: ExpectedReceiptStatus;
  statusLabel: string;
  comment: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  events: ExpectedReceiptEvent[];
};

export function fetchExpectedReceipts(params?: {
  productId?: string;
  status?: ExpectedReceiptStatus;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  return apiFetch<{
    items: ExpectedReceipt[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/expected-receipts${buildQuery(params ?? {})}`);
}

export function fetchActiveExpectedReceipts(productId: string) {
  return apiFetch<ExpectedReceipt[]>(
    `/expected-receipts/active${buildQuery({ productId })}`,
  );
}

export function createExpectedReceipt(payload: {
  productId: string;
  orderedQty: number;
  comment?: string;
}) {
  return apiFetch<ExpectedReceipt>('/expected-receipts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateExpectedReceipt(
  id: string,
  payload: { orderedQty?: number; comment?: string; reason: string },
) {
  return apiFetch<ExpectedReceipt>(`/expected-receipts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function closeExpectedReceipt(id: string, comment: string) {
  return apiFetch<ExpectedReceipt>(`/expected-receipts/${id}/close`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export function cancelExpectedReceipt(id: string, comment: string) {
  return apiFetch<ExpectedReceipt>(`/expected-receipts/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export function deleteExpectedReceipt(id: string) {
  return apiFetch<{ deleted: boolean }>(`/expected-receipts/${id}`, {
    method: 'DELETE',
  });
}
