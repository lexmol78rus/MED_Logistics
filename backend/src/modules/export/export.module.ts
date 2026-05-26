import { Module } from '@nestjs/common';
import { ExpiryModule } from '../expiry/expiry.module';
import { SettingsModule } from '../settings/settings.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ShiftReportService } from './shift-report.service';

@Module({
  imports: [ExpiryModule, SettingsModule],
  controllers: [ExportController],
  providers: [ExportService, ShiftReportService],
})
export class ExportModule {}
