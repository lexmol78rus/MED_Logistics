import { Controller, Get, Query } from '@nestjs/common';
import { READ_ROLES } from '../../common/constants/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExpiryQueryDto } from './dto/expiry-query.dto';
import { ExpiryService } from './expiry.service';

@Controller('expiry')
export class ExpiryController {
  constructor(private readonly expiry: ExpiryService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: ExpiryQueryDto) {
    return this.expiry.list(query);
  }

  @Roles(...READ_ROLES)
  @Get('summary')
  summary() {
    return this.expiry.getSummary();
  }
}
