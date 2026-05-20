export type EmailNotificationFlags = {
  passwordReset: boolean;
  lowStock: boolean;
  expiryCritical: boolean;
  lotBlocked: boolean;
  lotRecall: boolean;
  authFailed: boolean;
  system: boolean;
};

export type StoredMailSmtpSettings = {
  host: string;
  port: number;
  user: string;
  from: string;
  secure: boolean;
  passwordEnc?: string;
};

export type StoredMailSettings = {
  smtp: StoredMailSmtpSettings;
  notifications: EmailNotificationFlags;
};

export type MailSettingsResponse = {
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

export const DEFAULT_EMAIL_NOTIFICATION_FLAGS: EmailNotificationFlags = {
  passwordReset: true,
  lowStock: false,
  expiryCritical: false,
  lotBlocked: false,
  lotRecall: false,
  authFailed: false,
  system: false,
};

export const DEFAULT_STORED_MAIL_SETTINGS: StoredMailSettings = {
  smtp: {
    host: 'smtp.yandex.ru',
    port: 465,
    user: '',
    from: '',
    secure: true,
  },
  notifications: { ...DEFAULT_EMAIL_NOTIFICATION_FLAGS },
};

export type ResolvedSmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  secure: boolean;
  source: 'database' | 'environment';
};
