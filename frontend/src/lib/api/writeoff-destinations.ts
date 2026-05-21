import { apiFetch, buildQuery } from './client';

export type WriteoffDestinationItem = {
  id: string;
  name: string;
  type: string | null;
  isActive: boolean;
  legacyCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WriteoffDestinationsListResponse = {
  items: WriteoffDestinationItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function fetchWriteoffDestinations(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  activeOnly?: boolean;
}) {
  return apiFetch<WriteoffDestinationsListResponse>(
    `/writeoff-destinations${buildQuery({
      ...params,
      activeOnly: params?.activeOnly ? 'true' : undefined,
    })}`,
  );
}

export function createWriteoffDestination(payload: { name: string; type?: string }) {
  return apiFetch<WriteoffDestinationItem>('/writeoff-destinations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWriteoffDestination(
  id: string,
  payload: { name?: string; type?: string; isActive?: boolean },
) {
  return apiFetch<WriteoffDestinationItem>(`/writeoff-destinations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteWriteoffDestination(id: string) {
  return apiFetch<{ deleted?: boolean; archived?: boolean; item?: WriteoffDestinationItem }>(
    `/writeoff-destinations/${id}`,
    { method: 'DELETE' },
  );
}
