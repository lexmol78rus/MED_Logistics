import { apiFetch } from './client';

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

export function patchMailSettings(changes: PatchMailSettings) {
  return apiFetch<MailSettings>('/settings/mail', {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export function testMailSettings(to: string) {
  return apiFetch<{ success: boolean; message: string }>('/settings/mail/test', {
    method: 'POST',
    body: JSON.stringify({ to }),
  });
}
