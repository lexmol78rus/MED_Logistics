import type { AuditLogItem } from '../api/audit';
import { userDisplayName } from '../api/users';
import type { AuditLookups } from './types';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local.replace(/[._-]/g, ' ').trim() || email;
}

function pickMetaName(meta: Record<string, unknown> | null): string {
  if (!meta) return '';
  return str(meta.displayName) || str(meta.fullName) || str(meta.name);
}

export type ActorDisplay = {
  name: string;
  email: string | null;
};

/** Primary label for CSV / single-line export */
export function formatActorLabel(display: ActorDisplay): string {
  if (display.email && display.email !== display.name) {
    return `${display.name} (${display.email})`;
  }
  return display.name;
}

export function resolveActorDisplay(item: AuditLogItem, lookups: AuditLookups): ActorDisplay {
  const meta = asRecord(item.metadata);
  const metaEmail = str(meta?.email);
  const metaName = pickMetaName(meta);

  const apiName = str(item.actorDisplayName);
  const apiEmail = str(item.actorEmail) || metaEmail || null;

  if (apiName) {
    return { name: apiName, email: apiEmail };
  }

  if (item.actorId) {
    const user = lookups.usersById.get(item.actorId);
    if (user) {
      return {
        name: userDisplayName(user),
        email: user.email || apiEmail || null,
      };
    }
  }

  if (metaName) {
    return { name: metaName, email: metaEmail || null };
  }

  if (metaEmail) {
    return { name: nameFromEmail(metaEmail), email: metaEmail };
  }

  if (apiEmail) {
    return { name: nameFromEmail(apiEmail), email: apiEmail };
  }

  if (!item.actorId) {
    return { name: 'Система', email: null };
  }

  return { name: 'Неизвестный пользователь', email: null };
}
