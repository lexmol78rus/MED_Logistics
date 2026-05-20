import { apiFetch } from './client';

export type DashboardSummary = {
  productsCount: number;
  activeLotsCount: number;
  criticalExpiryCount: number;
  lowStockCount: number;
  expiringSoon: number;
  quarantineLots: number;
  blockedLots: number;
  recentMovements: {
    id: string;
    type: string;
    ref: string;
    desc: string;
    qty: string;
    lot: string | null;
    createdAt: string;
  }[];
};

export function fetchDashboardSummary() {
  return apiFetch<DashboardSummary>('/dashboard/summary');
}
