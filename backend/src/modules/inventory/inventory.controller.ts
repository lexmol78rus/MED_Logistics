import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.inventory.list(query);
  }
}
