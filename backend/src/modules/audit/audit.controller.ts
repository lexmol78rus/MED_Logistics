import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.audit.list(query);
  }
}
