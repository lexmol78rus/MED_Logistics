import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { SettingsCryptoService } from '../../common/crypto/settings-crypto.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_EMAIL_NOTIFICATION_FLAGS,
  DEFAULT_STORED_MAIL_SETTINGS,
  type EmailNotificationFlags,
  type MailSettingsResponse,
  type ResolvedSmtpConfig,
  type StoredMailSettings,
} from '../settings/mail-settings.types';

@Injectable()
export class MailConfigService {
  private readonly logger = new Logger(MailConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: SettingsCryptoService,
  ) {}

  async getStoredMailSettings(): Promise<StoredMailSettings | null> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });
    if (!row) return null;

    const payload = row.payload as Prisma.JsonObject;
    const mail = payload.mail as StoredMailSettings | undefined;
    if (!mail?.smtp) return null;

    return {
      smtp: {
        host: mail.smtp.host ?? '',
        port: mail.smtp.port ?? 465,
        user: mail.smtp.user ?? '',
        from: mail.smtp.from ?? '',
        secure: mail.smtp.secure ?? mail.smtp.port === 465,
        passwordEnc: mail.smtp.passwordEnc,
      },
      notifications: {
        ...DEFAULT_EMAIL_NOTIFICATION_FLAGS,
        ...(mail.notifications ?? {}),
      },
    };
  }

  async resolveSmtpConfig(): Promise<ResolvedSmtpConfig | null> {
    const stored = await this.getStoredMailSettings();
    if (stored?.smtp.host && stored.smtp.user && stored.smtp.passwordEnc) {
      try {
        const password = this.crypto.decrypt(stored.smtp.passwordEnc);
        this.logger.log(
          `[SMTP] decrypt ok passwordLen=${password.length} host=${stored.smtp.host} port=${stored.smtp.port} user=${stored.smtp.user} secure=${stored.smtp.secure} source=database`,
        );
        return {
          host: stored.smtp.host,
          port: stored.smtp.port,
          user: stored.smtp.user,
          password,
          from: stored.smtp.from || stored.smtp.user,
          secure: stored.smtp.secure,
          source: 'database',
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[SMTP] decrypt failed — ${message}. Re-save SMTP password in Settings (SETTINGS_ENCRYPTION_KEY may have changed).`,
        );
        return null;
      }
    }

    const host = this.config.get<string>('smtp.host')?.trim();
    const user = this.config.get<string>('smtp.user')?.trim();
    const password = this.config.get<string>('smtp.password')?.trim();
    if (!host || !user || !password) {
      return null;
    }

    const port = this.config.get<number>('smtp.port') ?? 465;
    return {
      host,
      port,
      user,
      password,
      from:
        this.config.get<string>('smtp.from')?.trim() ||
        user,
      secure: port === 465,
      source: 'environment',
    };
  }

  async getNotificationFlags(): Promise<EmailNotificationFlags> {
    const stored = await this.getStoredMailSettings();
    return stored?.notifications ?? { ...DEFAULT_EMAIL_NOTIFICATION_FLAGS };
  }

  async toPublicResponse(smtpReady: boolean): Promise<MailSettingsResponse> {
    const stored = await this.getStoredMailSettings();
    const envHost = this.config.get<string>('smtp.host')?.trim();
    const envUser = this.config.get<string>('smtp.user')?.trim();
    const envPassword = this.config.get<string>('smtp.password')?.trim();

    if (stored?.smtp) {
      return {
        smtp: {
          host: stored.smtp.host,
          port: stored.smtp.port,
          user: stored.smtp.user,
          from: stored.smtp.from,
          secure: stored.smtp.secure,
          passwordConfigured: Boolean(stored.smtp.passwordEnc),
        },
        notifications: stored.notifications,
        smtpReady,
        source: 'database',
      };
    }

    if (envHost && envUser && envPassword) {
      const port = this.config.get<number>('smtp.port') ?? 465;
      return {
        smtp: {
          host: envHost,
          port,
          user: envUser,
          from: this.config.get<string>('smtp.from')?.trim() || envUser,
          secure: port === 465,
          passwordConfigured: true,
        },
        notifications: { ...DEFAULT_EMAIL_NOTIFICATION_FLAGS },
        smtpReady,
        source: 'environment',
      };
    }

    return {
      smtp: { ...DEFAULT_STORED_MAIL_SETTINGS.smtp, passwordConfigured: false },
      notifications: { ...DEFAULT_EMAIL_NOTIFICATION_FLAGS },
      smtpReady,
      source: 'none',
    };
  }
}
