import { apiFetch } from './client';
import { hardDeleteLegacyMailPatchKeys } from './settings-patch-guard';

export type EmailNotificationFlags = {
  passwordReset: boolean;
  lowStock: boolean;
  expiryCritical: boolean;
  lotBlocked: boolean;
  lotRecall: boolean;
  authFailed: boolean;
  system: boolean;
};

export type MailSettings = {
  smtp: {
    host: string;
    port: number;
    user: string;
    from: string;
    secure: boolean;
    passwordConfigured: boolean;
  };
  notifications: EmailNotificationFlags;
  smtpReady: boolean;
  source: 'database' | 'environment' | 'none';
};

export type PatchMailSettings = {
  smtp?: {
    host?: string;
    port?: number;
    user?: string;
    from?: string;
    secure?: boolean;
    password?: string;
  };
  notifications?: Partial<EmailNotificationFlags>;
};

export function fetchMailSettings() {
  return apiFetch<MailSettings>('/settings/mail');
}

export function patchMailSettings(changes: PatchMailSettings & Record<string, unknown>) {
  const payload: Record<string, unknown> = { ...changes };
  if (payload.mail && typeof payload.mail === 'object' && !Array.isArray(payload.mail)) {
    const m = payload.mail as Record<string, unknown>;
    if (m.smtp) payload.smtp = payload.smtp ?? m.smtp;
    if (m.notifications) payload.notifications = payload.notifications ?? m.notifications;
  }
  hardDeleteLegacyMailPatchKeys(payload);
  const body: PatchMailSettings = {
    smtp: payload.smtp as PatchMailSettings['smtp'],
    notifications: payload.notifications as PatchMailSettings['notifications'],
  };
  return apiFetch<MailSettings>('/settings/mail', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function testMailSettings(to: string) {
  return apiFetch<{ success: boolean; message: string }>('/settings/mail/test', {
    method: 'POST',
    body: JSON.stringify({ to }),
  });
}
