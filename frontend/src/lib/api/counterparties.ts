import { apiBaseUrl } from '../../config/env';
import { apiFetch } from './client';
import { useAuthStore } from '../../stores/authStore';

export type CounterpartyType = 'CUSTOMER' | 'SUPPLIER' | 'LEGAL_ENTITY';

export type Counterparty = {
  id: string;
  type: CounterpartyType;
  name: string;
  fullName?: string | null;
  inn: string | null;
  kpp: string | null;
  comment: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContractDocType = 'DOCX' | 'HTML' | 'PDF' | 'OTHER';

export type Contract = {
  id: string;
  counterpartyId: string;
  number: string;
  date: string | null;
  title: string | null;
  docType: ContractDocType;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileName: string;
  storagePath: string;
  uploadedBy: string | null;
  createdAt: string;
};

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers: HeadersInit = {
    ...(init.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(`${apiBaseUrl}${path}`, { ...init, headers });
}

export function fetchCounterparties(type: CounterpartyType, q?: string) {
  const qs = new URLSearchParams({ type, ...(q ? { q } : {}) });
  return apiFetch<{ items: Counterparty[] }>(`/counterparties?${qs.toString()}`);
}

export function createCounterparty(payload: {
  type: CounterpartyType;
  name: string;
  fullName?: string;
  inn?: string;
  kpp?: string;
  comment?: string;
}) {
  return apiFetch<Counterparty>(`/counterparties`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateCounterparty(
  id: string,
  payload: Partial<Omit<Counterparty, 'id' | 'type' | 'createdAt' | 'updatedAt'>>,
) {
  return apiFetch<Counterparty>(`/counterparties/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteCounterparty(id: string) {
  return apiFetch<{ ok: true; removedContracts: number; detachedShipments: number }>(
    `/counterparties/${id}`,
    { method: 'DELETE' },
  );
}

export function fetchContracts(counterpartyId: string, q?: string) {
  const qs = new URLSearchParams({ ...(q ? { q } : {}) });
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<{ items: Contract[] }>(`/counterparties/${counterpartyId}/contracts${suffix}`);
}

export async function uploadContract(
  counterpartyId: string,
  file: File,
  meta: { number: string; date?: string; title?: string },
): Promise<Contract> {
  const form = new FormData();
  form.append('file', file);
  form.append('number', meta.number);
  if (meta.date) form.append('date', meta.date);
  if (meta.title) form.append('title', meta.title);

  const response = await authFetch(`/counterparties/${counterpartyId}/contracts`, {
    method: 'POST',
    body: form,
  });
  const body = (await response.json().catch(() => ({}))) as Contract & { message?: string | string[] };
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message || `Ошибка загрузки (${response.status})`);
  }
  return body;
}

export function searchContractsByNumber(number: string) {
  const qs = new URLSearchParams({ number });
  return apiFetch<{ items: Array<Contract & { counterparty: { id: string; name: string; type: CounterpartyType } }> }>(
    `/contracts/search?${qs.toString()}`,
  );
}

export function fetchContractProcurementItems(contractId: string, opts?: { force?: boolean }) {
  const qs = new URLSearchParams({ ...(opts?.force ? { force: '1' } : {}) });
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<{
    contractId: string;
    items: Array<{
      contractLineNo: number;
      name: string;
      code?: string;
      unit?: string;
      vatRate?: string;
      priceWithVat?: string;
      quantity: string;
      sum?: string;
      country?: string;
    }>;
  }>(`/contracts/${contractId}/procurement-items${suffix}`);
}

export async function fetchContractFileBlob(contractId: string): Promise<Blob> {
  const response = await authFetch(`/contracts/${contractId}/file`);
  if (!response.ok) throw new Error(`Не удалось открыть файл (${response.status})`);
  return response.blob();
}

export async function deleteContract(contractId: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/contracts/${contractId}`, { method: 'DELETE' });
}

export function updateContractMeta(
  contractId: string,
  payload: { number?: string; date?: string | null; title?: string | null },
) {
  return apiFetch<Contract>(`/contracts/${contractId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

