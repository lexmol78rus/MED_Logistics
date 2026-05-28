import type { WriteoffRecommendation } from '../../types/api';
import { apiFetch, buildQuery } from './client';

export type InventoryBalanceRow = {
  productId: string;
  productSku: string;
  productName: string;
  lotId: string;
  lotNumber: string;
  lotStatus: string;
  expiryDate: string | null;
  location: string | null;
  totalQuantity: number;
  availableQuantity: number;
  blockedQuantity: number;
  quarantinedQuantity: number;
  expiredQuantity: number;
  reservedQuantity: number;
  minStock: number | null;
  reorderPoint: number | null;
};

export type ReceivePayload = {
  barcode?: string;
  productId?: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  location?: string;
  expectedReceiptId?: string;
};

export type WriteoffPayload = {
  productId: string;
  writeOffDestinationId: string;
  writeOffComment?: string;
  lines: { lotId: string; quantity: number }[];
  useFefoRecommendations?: boolean;
};

export function fetchInventoryBalance(params?: {
  productId?: string;
  lotId?: string;
  status?: string;
  location?: string;
  page?: number;
  pageSize?: number;
}) {
  return apiFetch<{
    items: InventoryBalanceRow[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/inventory/balance${buildQuery(params ?? {})}`);
}

export function receiveInventory(payload: ReceivePayload) {
  return apiFetch<{ success: boolean; lotId: string; movementId: string }>(
    '/inventory/receive',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export function fetchWriteoffRecommendation(params: {
  productId?: string;
  q?: string;
  useFefoRecommendations?: boolean;
}) {
  return apiFetch<WriteoffRecommendation>(
    `/inventory/writeoff/recommendation${buildQuery(params)}`,
  );
}

export function writeoffInventory(payload: WriteoffPayload) {
  return apiFetch<{ success: boolean; movementIds: string[] }>(
    '/inventory/writeoff',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export function writeoffInventoryBatch(payload: {
  shipmentId?: string;
  items: WriteoffPayload[];
}) {
  return apiFetch<{ success: boolean; movementIds: string[] }>(
    '/inventory/writeoff/batch',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export type CorrectWriteoffLinePayload = {
  reference: string;
  newQuantity?: number;
  remove?: boolean;
};

export type CorrectWriteoffAdditionPayload = {
  productId: string;
  lotId: string;
  quantity: number;
  writeOffDestinationId: string;
  writeOffComment?: string;
};

export function correctWriteoffGroup(payload: {
  operationGroupId?: string;
  movementReferences?: string[];
  editReason: string;
  updates?: CorrectWriteoffLinePayload[];
  additions?: CorrectWriteoffAdditionPayload[];
}) {
  return apiFetch<{
    success: boolean;
    correctionSessionId: string;
    movementIds: string[];
  }>('/inventory/writeoff/correct', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
