import { Controller, Get, Query } from '@nestjs/common';
import { READ_ROLES } from '../../common/constants/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { MovementsQueryDto } from './dto/movements-query.dto';
import { MovementsService } from './movements.service';

@Controller('movements')
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: MovementsQueryDto) {
    return this.movements.list(query);
  }
}
