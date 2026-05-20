import { Controller, Get } from '@nestjs/common';
import { READ_ROLES } from '../../common/constants/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Roles(...READ_ROLES)
  @Get('summary')
  summary() {
    return this.dashboard.getSummary();
  }
}
