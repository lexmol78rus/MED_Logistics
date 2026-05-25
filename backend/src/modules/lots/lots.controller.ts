import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ADMIN_MANAGER,
  ADMIN_MANAGER_OPERATOR,
  READ_ROLES,
} from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { LotsQueryDto } from './dto/lots-query.dto';
import { UpdateLotLocationDto } from './dto/update-lot-location.dto';
import { UpdateLotStatusDto } from './dto/update-lot-status.dto';
import { LotsService } from './lots.service';

@Controller('lots')
export class LotsController {
  constructor(private readonly lots: LotsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: LotsQueryDto) {
    return this.lots.list(query);
  }

  @Roles(...READ_ROLES)
  @Get('recall/:lotNumber')
  recallDetail(@Param('lotNumber') lotNumber: string) {
    return this.lots.getRecallDetail(lotNumber);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLotStatusDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.lots.updateStatus(id, dto, user?.email);
  }

  @Roles(...ADMIN_MANAGER_OPERATOR)
  @Patch(':id/location')
  updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLotLocationDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.lots.updateLocation(id, dto, user?.email);
  }
}
