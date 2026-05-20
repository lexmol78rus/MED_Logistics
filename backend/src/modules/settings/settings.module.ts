import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { SettingsController } from './settings.controller';
import { SettingsMailService } from './settings-mail.service';
import { SettingsService } from './settings.service';

@Module({
  imports: [MailModule],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsMailService],
  exports: [SettingsService, SettingsMailService],
})
export class SettingsModule {}
