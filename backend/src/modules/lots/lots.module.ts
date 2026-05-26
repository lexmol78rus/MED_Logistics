import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';

@Module({
  imports: [SettingsModule],
  controllers: [LotsController],
  providers: [LotsService],
})
export class LotsModule {}
