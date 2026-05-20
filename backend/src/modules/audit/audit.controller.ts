import { Controller, Get, Query } from '@nestjs/common';
import { ADMIN_ONLY } from '../../common/constants/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditService } from './audit.service';

@Controller('audit')
@Roles(...ADMIN_ONLY)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditQueryDto) {
    return this.audit.list(query);
  }
}
