import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  buildPasswordResetEmail,
  buildSmtpTestEmail,
} from './email-templates';
import { MailConfigService } from './mail-config.service';
import type { ResolvedSmtpConfig } from '../settings/mail-settings.types';

export type SendRawEmailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private activeConfig: ResolvedSmtpConfig | null = null;
  private smtpReady = false;
  private lastSmtpError: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly mailConfig: MailConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.verifySmtpConnection();
  }

  isSmtpReady(): boolean {
    return this.smtpReady;
  }

  getAppUrl(): string {
    return this.config.getOrThrow<string>('appUrl');
  }

  invalidateTransporter(): void {
    if (this.transporter) {
      this.transporter.close();
    }
    this.transporter = null;
    this.activeConfig = null;
    this.smtpReady = false;
  }

  private async getTransporter(): Promise<Transporter | null> {
    const resolved = await this.mailConfig.resolveSmtpConfig();
    if (!resolved) {
      return null;
    }

    if (
      this.transporter &&
      this.activeConfig &&
      this.configMatches(this.activeConfig, resolved)
    ) {
      return this.transporter;
    }

    if (this.transporter) {
      this.transporter.close();
    }

    this.activeConfig = resolved;
    this.transporter = nodemailer.createTransport({
      host: resolved.host,
      port: resolved.port,
      secure: resolved.secure,
      auth: { user: resolved.user, pass: resolved.password },
    });

    return this.transporter;
  }

  private configMatches(
    a: ResolvedSmtpConfig,
    b: ResolvedSmtpConfig,
  ): boolean {
    return (
      a.host === b.host &&
      a.port === b.port &&
      a.user === b.user &&
      a.password === b.password &&
      a.from === b.from &&
      a.secure === b.secure &&
      a.source === b.source
    );
  }

  private formatSmtpError(error: unknown): string {
    const err = error as {
      message?: string;
      code?: string;
      responseCode?: number;
    };
    const message = err?.message ?? String(error);
    const code = err?.code;
    if (code === 'EAUTH' || message.includes('535')) {
      return 'SMTP auth failed (535): неверный логин или пароль приложения Яндекс. Создайте новый пароль приложения для ящика SMTP User и сохраните в настройках.';
    }
    if (code) {
      return `${message} (${code})`;
    }
    return message;
  }

  private logResolvedConfig(): void {
    const c = this.activeConfig;
    if (!c) return;
    this.logger.log(
      `[SMTP] config host=${c.host} port=${c.port} secure=${c.secure} user=${c.user} from=${c.from} source=${c.source}`,
    );
  }

  async verifySmtpConnection(): Promise<boolean> {
    const transport = await this.getTransporter();
    if (!transport) {
      this.smtpReady = false;
      this.lastSmtpError =
        'SMTP не настроен — укажите host, user и пароль в Settings или SMTP_* в .env';
      this.logger.error(`[SMTP] connection failed — ${this.lastSmtpError}`);
      return false;
    }

    this.logResolvedConfig();

    try {
      await transport.verify();
      this.smtpReady = true;
      this.lastSmtpError = null;
      this.logger.log(
        `[SMTP] ready (source=${this.activeConfig?.source ?? 'unknown'})`,
      );
      return true;
    } catch (error) {
      this.smtpReady = false;
      this.lastSmtpError = this.formatSmtpError(error);
      const err = error as { code?: string };
      if (err?.code === 'EAUTH') {
        this.logger.error(`[SMTP] auth failed — ${this.lastSmtpError}`);
      } else {
        this.logger.error(`[SMTP] connection failed — ${this.lastSmtpError}`);
      }
      return false;
    }
  }

  async sendRawEmail(params: SendRawEmailParams): Promise<boolean> {
    const transport = await this.getTransporter();
    const from = this.activeConfig?.from ?? 'noreply@med.local';

    if (!transport) {
      this.logger.warn('[SMTP] email not sent — transport not configured');
      return false;
    }

    try {
      await transport.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      this.logger.log(`[SMTP] email sent to ${params.to}`);
      return true;
    } catch (error) {
      this.lastSmtpError = this.formatSmtpError(error);
      this.logger.error(
        `[SMTP] email failed for ${params.to} — ${this.lastSmtpError}`,
      );
      return false;
    }
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
    const verified = await this.verifySmtpConnection();
    if (!verified) {
      return {
        success: false,
        message:
          this.lastSmtpError ??
          'Ошибка SMTP — проверьте настройки и подключение',
      };
    }

    const template = buildSmtpTestEmail(this.getAppUrl());
    const sent = await this.sendRawEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    if (sent) {
      return { success: true, message: 'Письмо успешно отправлено' };
    }
    return {
      success: false,
      message:
        this.lastSmtpError ??
        'Ошибка SMTP — проверьте настройки и подключение',
    };
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    const template = buildPasswordResetEmail(this.getAppUrl(), resetUrl);
    return this.sendRawEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }
}
