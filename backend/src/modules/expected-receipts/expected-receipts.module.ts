import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ExpectedReceiptsController } from './expected-receipts.controller';
import { ExpectedReceiptsService } from './expected-receipts.service';

@Module({
  imports: [AuditModule],
  controllers: [ExpectedReceiptsController],
  providers: [ExpectedReceiptsService],
  exports: [ExpectedReceiptsService],
})
export class ExpectedReceiptsModule {}
