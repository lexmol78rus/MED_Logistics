import { apiFetch } from './client';
import type { LotListItem } from '../../types/api';

export type RecallLotDetail = {
  id: string;
  lot: string;
  ref: string;
  productId: string;
  name: string;
  manufacturer: string | null;
  expiry: string | null;
  status: string;
  dbStatus: string;
  qty: number;
  locations: string[];
  distributed: number;
  movements: {
    reference: string;
    type: string;
    quantity: number;
    date: string;
    actor: string | null;
  }[];
};

export function fetchRecallLot(lotNumber: string) {
  return apiFetch<RecallLotDetail>(`/lots/recall/${encodeURIComponent(lotNumber.trim())}`);
}

export function recallUpdateStatus(
  id: string,
  status: 'QUARANTINE' | 'BLOCKED' | 'OK',
  recall?: boolean,
) {
  return apiFetch<LotListItem>(`/lots/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, recall }),
  });
}
