import { apiFetch, buildQuery } from './client';

export type AuditLogItem = {
  id: string;
  actorId: string | null;
  /** Имя для отображения (displayName или из email) */
  actorDisplayName?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
};

export function fetchAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  actorId?: string;
  action?: string;
  entityType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return apiFetch<{
    items: AuditLogItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/audit${buildQuery(params ?? {})}`);
}
