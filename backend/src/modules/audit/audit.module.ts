import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditLogService } from './audit-log.service';
import { AuditService } from './audit.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
