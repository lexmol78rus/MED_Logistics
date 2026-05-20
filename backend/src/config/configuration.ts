export interface AppConfiguration {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  appUrl: string;
  logLevel: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  };
  throttle: {
    ttl: number;
    limit: number;
    forgotPasswordLimit: number;
  };
  settingsEncryptionKey: string;
}

export default (): AppConfiguration => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  appUrl: (process.env.APP_URL ?? 'http://localhost').replace(/\/$/, ''),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '465', 10),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? '',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    forgotPasswordLimit: parseInt(
      process.env.THROTTLE_FORGOT_PASSWORD_LIMIT ?? '5',
      10,
    ),
  },
  settingsEncryptionKey:
    process.env.SETTINGS_ENCRYPTION_KEY ??
    (process.env.NODE_ENV !== 'production'
      ? (process.env.JWT_ACCESS_SECRET ?? '').slice(0, 32)
      : ''),
});
