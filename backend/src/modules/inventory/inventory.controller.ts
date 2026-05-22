import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ADMIN_MANAGER,
  ADMIN_MANAGER_OPERATOR,
  ADMIN_ONLY,
  READ_ROLES,
} from '../../common/constants/roles';
import { SearchPaginationQueryDto } from '../../common/dto/search-pagination-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { InventoryBalanceQueryDto } from './dto/inventory-balance-query.dto';
import { ReceiveInventoryDto } from './dto/receive-inventory.dto';
import { WriteoffInventoryDto } from './dto/writeoff-inventory.dto';
import { WriteoffBatchDto } from './dto/writeoff-batch.dto';
import { CorrectWriteoffGroupDto } from './dto/correct-writeoff-group.dto';
import { WriteoffRecommendationQueryDto } from './dto/writeoff-recommendation-query.dto';
import { InventoryBalanceService } from './inventory-balance.service';
import { InventoryValidationService } from './inventory-validation.service';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly balance: InventoryBalanceService,
    private readonly validation: InventoryValidationService,
  ) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: SearchPaginationQueryDto) {
    return this.inventory.list(query);
  }

  @Roles(...READ_ROLES)
  @Get('balance')
  getBalance(@Query() query: InventoryBalanceQueryDto) {
    return this.balance.getBalance(query);
  }

  @Roles(...ADMIN_ONLY)
  @Get('reconcile')
  reconcile() {
    return this.validation.runReconciliation();
  }

  @Roles(...READ_ROLES)
  @Get('writeoff/recommendation')
  writeoffRecommendation(@Query() query: WriteoffRecommendationQueryDto) {
    return this.inventory.writeoffRecommendation(query);
  }

  @Roles(...ADMIN_MANAGER_OPERATOR)
  @Post('receive')
  receive(
    @Body() dto: ReceiveInventoryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.inventory.receive(dto, user?.email, user?.userId);
  }

  @Roles(...ADMIN_MANAGER_OPERATOR)
  @Post('writeoff')
  writeoff(
    @Body() dto: WriteoffInventoryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.inventory.writeoff(dto, user?.email, user?.userId);
  }

  @Roles(...ADMIN_MANAGER_OPERATOR)
  @Post('writeoff/batch')
  writeoffBatch(
    @Body() dto: WriteoffBatchDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.inventory.writeoffBatch(dto, user?.email, user?.userId);
  }

  @Roles(...ADMIN_MANAGER)
  @Post('writeoff/correct')
  correctWriteoffGroup(
    @Body() dto: CorrectWriteoffGroupDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.inventory.correctWriteoffGroup(dto, user?.email, user?.userId);
  }
}
