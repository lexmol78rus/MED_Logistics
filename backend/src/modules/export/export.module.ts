import { Module } from '@nestjs/common';
import { ExpiryModule } from '../expiry/expiry.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [ExpiryModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
