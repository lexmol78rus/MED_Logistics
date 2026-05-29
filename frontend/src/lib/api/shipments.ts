import { apiFetch } from './client';

export type ShipmentStatus =
  | 'DRAFT'
  | 'NEW'
  | 'PICKING'
  | 'PICKING_ON_HOLD'
  | 'PICKED'
  | 'DISPATCHED';

export type ShipmentRefValidation = {
  notFoundRefs: string[];
  isDraft: boolean;
};

export type ShipmentAssemblyReservationSummary = {
  lines: number;
  quantity: number;
};

export type ShipmentPickingOutcome = 'SUCCESS' | 'PARTIAL' | 'ISSUE';

export type ShipmentRefLinkStatus = 'LINKED' | 'NOT_FOUND' | 'NO_REF';

export type ShipmentRefLinkSummary = {
  total: number;
  linked: number;
  notFound: number;
  noRef: number;
};

export type ShipmentListItem = {
  id: string;
  status: ShipmentStatus;
  counterparty: { id: string; name: string; type: 'CUSTOMER' | 'SUPPLIER' } | null;
  legalEntity: { id: string; name: string; type: 'LEGAL_ENTITY' } | null;
  contract: { id: string; number: string } | null;
  note: string | null;
  createdBy: string | null;
  pickingSentAt: string | null;
  pickingPausedAt: string | null;
  pickingRecalledAt: string | null;
  warehouseMessage: string | null;
  pickingOutcome: ShipmentPickingOutcome | null;
  pickingCompleteComment: string | null;
  pickedAt: string | null;
  writeoffCompletedAt: string | null;
  createdAt: string;
  itemsCount: number;
  /** Наименования позиций — для умного поиска в списке. */
  itemNames?: string[];
  /** REF (код) позиций — для умного поиска в списке. */
  itemRefs?: string[];
};

export type ShipmentItem = {
  id: string;
  shipmentId: string;
  name: string;
  code: string | null;
  unit: string | null;
  vatRate: string | null;
  priceWithVat: string | null;
  quantity: string;
  sum: string | null;
  contractLineNo: number | null;
  managerNote: string | null;
  managerTag: string | null;
  productId: string | null;
  productRef: string | null;
  productName: string | null;
  refLinkStatus: ShipmentRefLinkStatus;
};

export type ShipmentDetail = {
  id: string;
  status: ShipmentStatus;
  counterpartyId: string | null;
  legalEntityId: string | null;
  contractId: string | null;
  note: string | null;
  createdBy: string | null;
  pickingSentAt: string | null;
  pickingPausedAt: string | null;
  pickingRecalledAt: string | null;
  warehouseMessage: string | null;
  pickingOutcome: ShipmentPickingOutcome | null;
  pickingCompleteComment: string | null;
  pickedAt: string | null;
  writeoffCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counterparty:
    | { id: string; name: string; inn: string | null; kpp: string | null; type: 'CUSTOMER' | 'SUPPLIER' }
    | null;
  legalEntity:
    | { id: string; name: string; inn: string | null; kpp: string | null; type: 'LEGAL_ENTITY' }
    | null;
  contract: { id: string; number: string; date: string | null; title: string | null } | null;
  items: ShipmentItem[];
  refLinkSummary: ShipmentRefLinkSummary;
};

export type CreateShipmentPayload = {
  counterpartyId?: string;
  legalEntityId?: string;
  contractId?: string;
  note?: string;
  items: Array<{
    name: string;
    code?: string;
    unit?: string;
    vatRate?: string;
    priceWithVat?: string;
    quantity: string;
    sum?: string;
    contractLineNo?: number;
    managerNote?: string;
    managerTag?: string;
  }>;
};

export function fetchShipments(status?: ShipmentStatus) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<{ items: ShipmentListItem[] }>(`/shipments${qs}`);
}

export function fetchShipment(id: string) {
  return apiFetch<ShipmentDetail>(`/shipments/${id}`);
}

export function createShipment(payload: CreateShipmentPayload) {
  return apiFetch<{
    id: string;
    status: ShipmentStatus;
    reservation: ShipmentAssemblyReservationSummary;
    refValidation: ShipmentRefValidation;
  }>(`/shipments`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateShipment(id: string, payload: CreateShipmentPayload) {
  return apiFetch<{
    ok: true;
    id: string;
    status: ShipmentStatus;
    updatedAt: string;
    reservation: ShipmentAssemblyReservationSummary;
    refValidation: ShipmentRefValidation;
  }>(`/shipments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function sendShipmentToPicking(id: string) {
  return apiFetch<{ ok: true; id: string; status: ShipmentStatus; pickingSentAt: string | null }>(
    `/shipments/${id}/send-to-picking`,
    { method: 'PATCH' },
  );
}

export function pauseShipmentPicking(id: string, comment: string) {
  return apiFetch<{ ok: true; id: string; status: ShipmentStatus; warehouseMessage: string | null }>(
    `/shipments/${id}/pause-picking`,
    { method: 'PATCH', body: JSON.stringify({ comment }) },
  );
}

export function resumeShipmentPicking(id: string, comment?: string) {
  return apiFetch<{ ok: true; id: string; status: ShipmentStatus; warehouseMessage: string | null }>(
    `/shipments/${id}/resume-picking`,
    { method: 'PATCH', body: JSON.stringify(comment ? { comment } : {}) },
  );
}

export function recallShipmentFromPicking(id: string, comment: string) {
  return apiFetch<{
    ok: true;
    id: string;
    status: ShipmentStatus;
    warehouseMessage: string | null;
    pickingRecalledAt: string | null;
  }>(`/shipments/${id}/recall-from-picking`, { method: 'PATCH', body: JSON.stringify({ comment }) });
}

export function completeShipmentPicking(
  id: string,
  payload: { outcome: ShipmentPickingOutcome; comment: string },
) {
  return apiFetch<{
    ok: true;
    id: string;
    status: ShipmentStatus;
    pickingOutcome: ShipmentPickingOutcome;
    pickingCompleteComment: string;
    warehouseMessage: string | null;
    pickedAt: string | null;
  }>(`/shipments/${id}/complete-picking`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteShipment(id: string) {
  return apiFetch<{ ok: true }>(`/shipments/${id}`, { method: 'DELETE' });
}

export function shipmentStatusBadge(status: ShipmentStatus): { label: string; className: string } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Черновик', className: 'bg-rose-100 text-rose-900 border-rose-200' };
    case 'NEW':
      return { label: 'Новый', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'PICKING':
      return { label: 'Сборка', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'PICKING_ON_HOLD':
      return { label: 'Пауза', className: 'bg-orange-100 text-orange-900 border-orange-300' };
    case 'PICKED':
      return { label: 'К списанию', className: 'bg-violet-100 text-violet-900 border-violet-200' };
    case 'DISPATCHED':
      return { label: 'Отгружен', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export type ShipmentPrintData = {
  id: string;
  status: ShipmentStatus;
  createdAt: string;
  pickingSentAt: string | null;
  pickingPausedAt: string | null;
  pickingRecalledAt: string | null;
  warehouseMessage: string | null;
  pickingOutcome: ShipmentPickingOutcome | null;
  pickingCompleteComment: string | null;
  writeoffCompletedAt: string | null;
  counterparty: { name: string; inn: string | null; kpp: string | null } | null;
  legalEntity: { name: string; inn: string | null; kpp: string | null } | null;
  contract: { number: string; date: string | null; title: string | null } | null;
  items: Array<{
    lineNo: number;
    name: string;
    code: string | null;
    unit: string | null;
    vatRate: string | null;
    priceWithVat: string | null;
    quantity: string;
    sum: string | null;
    managerNote: string | null;
    managerTag: string | null;
    productId: string | null;
    productRef: string | null;
    productName: string | null;
    refLinkStatus: ShipmentRefLinkStatus;
    targetQty: number;
  }>;
  refLinkSummary: ShipmentRefLinkSummary;
  totals: { sum: number };
};

export type ShipmentWriteoffCartSeedLine = {
  shipmentItemId: string;
  lineNo: number;
  name: string;
  ref: string | null;
  quantity: number;
  productId: string | null;
  productRef: string | null;
  productName: string | null;
  refLinkStatus: ShipmentRefLinkStatus;
};

export type ShipmentWriteoffCartSeed = {
  shipmentId: string;
  status: ShipmentStatus;
  customerName: string;
  lines: ShipmentWriteoffCartSeedLine[];
  refLinkSummary: ShipmentRefLinkSummary;
};

export function fetchShipmentWriteoffCartSeed(id: string) {
  return apiFetch<ShipmentWriteoffCartSeed>(`/shipments/${id}/writeoff-cart-seed`);
}

export function fetchShipmentPrintData(id: string) {
  return apiFetch<ShipmentPrintData>(`/shipments/${id}/print-data`);
}

