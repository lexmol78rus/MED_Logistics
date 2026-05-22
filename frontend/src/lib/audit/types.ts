import type { AuditLogItem } from '../api/audit';

export type AuditCategory =
  | 'all'
  | 'login'
  | 'receive'
  | 'writeoff'
  | 'block'
  | 'users'
  | 'settings'
  | 'expected_receipt'
  | 'products'
  | 'errors'
  | 'other';

export type AuditSeverity = 'normal' | 'warning' | 'danger';

export type EnrichedAuditRow = {
  raw: AuditLogItem;
  category: AuditCategory;
  categoryLabel: string;
  actionLabel: string;
  description: string;
  actorName: string;
  actorEmail: string | null;
  /** Одна строка для CSV */
  actorLabel: string;
  dateLabel: string;
  severity: AuditSeverity;
  searchText: string;
};

export type AuditLookups = {
  usersById: Map<string, { email: string; displayName: string | null }>;
  productsById: Map<string, { name: string; sku: string }>;
};

export type AuditDetailField = {
  label: string;
  value: string;
  mono?: boolean;
};
