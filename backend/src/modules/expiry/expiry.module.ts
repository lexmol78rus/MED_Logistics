import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { ExpiryController } from './expiry.controller';
import { ExpiryService } from './expiry.service';

@Module({
  imports: [SettingsModule],
  controllers: [ExpiryController],
  providers: [ExpiryService],
  exports: [ExpiryService],
})
export class ExpiryModule {}
