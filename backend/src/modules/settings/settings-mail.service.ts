import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SettingsCryptoService } from '../../common/crypto/settings-crypto.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { MailConfigService } from '../mail/mail-config.service';
import { MailService } from '../mail/mail.service';
import { PatchMailSettingsDto } from './dto/patch-mail-settings.dto';
import {
  DEFAULT_STORED_MAIL_SETTINGS,
  type MailSettingsResponse,
  type StoredMailSettings,
} from './mail-settings.types';
import { DEFAULT_SYSTEM_SETTINGS, type SystemSettingsPayload } from './settings.types';

@Injectable()
export class SettingsMailService {
  private readonly logger = new Logger(SettingsMailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly crypto: SettingsCryptoService,
    private readonly mail: MailService,
    private readonly mailConfig: MailConfigService,
  ) {}

  async getMailSettings(): Promise<MailSettingsResponse> {
    return this.mailConfig.toPublicResponse(this.mail.isSmtpReady());
  }

  async patchMailSettings(
    dto: PatchMailSettingsDto,
    actorId?: string,
    actorEmail?: string,
  ): Promise<MailSettingsResponse> {
    if (!this.crypto.isConfigured()) {
      throw new BadRequestException(
        'SETTINGS_ENCRYPTION_KEY не настроен на сервере',
      );
    }

    const row = await this.prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });
    const payload = (row?.payload ?? DEFAULT_SYSTEM_SETTINGS) as SystemSettingsPayload & {
      mail?: StoredMailSettings;
    };

    const current: StoredMailSettings = payload.mail
      ? {
          smtp: {
            ...DEFAULT_STORED_MAIL_SETTINGS.smtp,
            ...payload.mail.smtp,
          },
          notifications: {
            ...DEFAULT_STORED_MAIL_SETTINGS.notifications,
            ...payload.mail.notifications,
          },
        }
      : { ...DEFAULT_STORED_MAIL_SETTINGS };

    let passwordChanged = false;

    if (dto.smtp) {
      if (dto.smtp.host !== undefined) current.smtp.host = dto.smtp.host.trim();
      if (dto.smtp.port !== undefined) current.smtp.port = dto.smtp.port;
      if (dto.smtp.user !== undefined) current.smtp.user = dto.smtp.user.trim();
      if (dto.smtp.from !== undefined) current.smtp.from = dto.smtp.from.trim();
      if (dto.smtp.secure !== undefined) {
        current.smtp.secure = dto.smtp.secure;
      } else if (dto.smtp.port !== undefined) {
        current.smtp.secure = dto.smtp.port === 465;
      }

      if (dto.smtp.password !== undefined) {
        const pwd = dto.smtp.password.trim();
        if (pwd === '') {
          delete current.smtp.passwordEnc;
          passwordChanged = true;
        } else {
          current.smtp.passwordEnc = this.crypto.encrypt(pwd);
          passwordChanged = true;
        }
      }
    }

    if (dto.notifications) {
      current.notifications = {
        ...current.notifications,
        ...dto.notifications,
      };
    }

    const nextPayload = {
      ...payload,
      mail: current,
    } as unknown as Prisma.InputJsonValue;

    await this.prisma.systemSetting.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        payload: nextPayload,
        updatedBy: actorEmail ?? actorId ?? null,
      },
      update: {
        payload: nextPayload,
        updatedBy: actorEmail ?? actorId ?? null,
      },
    });

    this.mail.invalidateTransporter();
    await this.mail.verifySmtpConnection();

    await this.audit.write({
      actorId,
      action: 'MAIL_SETTINGS_UPDATE',
      entityType: 'system_settings',
      entityId: 'default',
      metadata: {
        host: current.smtp.host,
        port: current.smtp.port,
        user: current.smtp.user,
        from: current.smtp.from,
        secure: current.smtp.secure,
        passwordChanged,
        notifications: current.notifications,
      },
    });

    this.logger.log('[settings] mail settings updated');
    return this.mailConfig.toPublicResponse(this.mail.isSmtpReady());
  }

  async testMail(
    to: string,
    actorId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.mail.sendTestEmail(to.trim());

    await this.audit.write({
      actorId,
      action: result.success ? 'MAIL_TEST_SUCCESS' : 'MAIL_TEST_FAILED',
      entityType: 'system_settings',
      entityId: 'default',
      metadata: { to: to.trim(), message: result.message },
    });

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return result;
  }
}
