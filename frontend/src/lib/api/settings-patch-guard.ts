import {
  LEGACY_SETTINGS_KEYS,
  buildSettingsPatchPayload,
} from '../settings/storage';

/** Last-resort strip for PATCH /settings (warehouse DTO only). */
export function hardDeleteLegacyWarehousePatchKeys(payload: Record<string, unknown>): void {
  delete payload.mail;
  delete payload.smtp;
  delete payload.email;
  delete payload.notifications;
  delete payload.passwordEnc;
  for (const key of LEGACY_SETTINGS_KEYS) {
    delete payload[key];
  }
}

/** Strip wrapper keys for PATCH /settings/mail (smtp + notifications are valid). */
export function hardDeleteLegacyMailPatchKeys(payload: Record<string, unknown>): void {
  delete payload.mail;
  delete payload.email;
  delete payload.passwordEnc;
}

function unwrapLegacyMailWrapper(parsed: Record<string, unknown>): Record<string, unknown> {
  const nested = parsed.mail;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const m = nested as Record<string, unknown>;
    if (m.smtp && !parsed.smtp) parsed.smtp = m.smtp;
    if (m.notifications && !parsed.notifications) parsed.notifications = m.notifications;
  }
  hardDeleteLegacyMailPatchKeys(parsed);
  return parsed;
}

/**
 * Mutates outgoing PATCH body at the network boundary.
 * Returns replacement body string when path matches settings endpoints.
 */
export function finalizeSettingsPatchBody(
  path: string,
  method: string,
  body: BodyInit | null | undefined,
): { body: BodyInit | null | undefined; audited: boolean } {
  if (method !== 'PATCH' || typeof body !== 'string') {
    return { body: body ?? null, audited: false };
  }

  const normalized = path.split('?')[0] ?? path;

  if (normalized === '/settings') {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    hardDeleteLegacyWarehousePatchKeys(parsed);
    const whitelist = buildSettingsPatchPayload(parsed);
    return { body: JSON.stringify(whitelist), audited: true };
  }

  if (normalized === '/settings/mail') {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const fixed = unwrapLegacyMailWrapper(parsed);
    return { body: JSON.stringify(fixed), audited: true };
  }

  return { body, audited: false };
}
