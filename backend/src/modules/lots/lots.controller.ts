import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { LotsService } from './lots.service';

@Controller('lots')
export class LotsController {
  constructor(private readonly lots: LotsService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.lots.list(query);
  }
}
