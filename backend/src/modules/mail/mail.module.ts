import { Module } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';
import { MailConfigService } from './mail-config.service';
import { MailService } from './mail.service';

@Module({
  providers: [MailConfigService, MailService, EmailNotificationService],
  exports: [MailConfigService, MailService, EmailNotificationService],
})
export class MailModule {}
