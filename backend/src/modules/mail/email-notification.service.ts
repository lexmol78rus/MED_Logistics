import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { notDeletedUserWhere } from '../../common/utils/not-deleted-user';
import { PrismaService } from '../../prisma/prisma.service';
import type { EmailNotificationFlags } from '../settings/mail-settings.types';
import { buildOperationalAlertEmail } from './email-templates';
import { MailConfigService } from './mail-config.service';
import { MailService } from './mail.service';

export type EmailNotificationEvent =
  | 'password_reset'
  | 'low_stock'
  | 'expiry_critical'
  | 'lot_blocked'
  | 'lot_recall'
  | 'auth_failed'
  | 'system';

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  constructor(
    private readonly mail: MailService,
    private readonly mailConfig: MailConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async sendToAddress(
    event: EmailNotificationEvent,
    to: string,
    title: string,
    message: string,
    href?: string,
  ): Promise<boolean> {
    const flags = await this.mailConfig.getNotificationFlags();
    if (!this.isEventEnabled(event, flags)) {
      return false;
    }
    const template = buildOperationalAlertEmail(
      this.mail.getAppUrl(),
      title,
      message,
      href,
    );
    return this.mail.sendRawEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async notifyAdmins(
    event: EmailNotificationEvent,
    title: string,
    message: string,
    href?: string,
  ): Promise<void> {
    const flags = await this.mailConfig.getNotificationFlags();
    if (!this.isEventEnabled(event, flags)) {
      return;
    }

    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
        ...notDeletedUserWhere,
      },
      select: { email: true },
    });

    if (admins.length === 0) {
      this.logger.warn(`[email] no admin recipients for event ${event}`);
      return;
    }

    const template = buildOperationalAlertEmail(
      this.mail.getAppUrl(),
      title,
      message,
      href,
    );

    for (const admin of admins) {
      const sent = await this.mail.sendRawEmail({
        to: admin.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      if (sent) {
        this.logger.log(`[email] ${event} sent to ${admin.email}`);
      }
    }
  }

  private isEventEnabled(
    event: EmailNotificationEvent,
    flags: EmailNotificationFlags,
  ): boolean {
    const map: Record<EmailNotificationEvent, keyof EmailNotificationFlags> = {
      password_reset: 'passwordReset',
      low_stock: 'lowStock',
      expiry_critical: 'expiryCritical',
      lot_blocked: 'lotBlocked',
      lot_recall: 'lotRecall',
      auth_failed: 'authFailed',
      system: 'system',
    };
    return flags[map[event]] === true;
  }
}
