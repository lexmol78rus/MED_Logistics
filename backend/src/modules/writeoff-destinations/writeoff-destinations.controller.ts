import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ADMIN_MANAGER, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateWriteoffDestinationDto } from './dto/create-writeoff-destination.dto';
import { UpdateWriteoffDestinationDto } from './dto/update-writeoff-destination.dto';
import { WriteoffDestinationsQueryDto } from './dto/writeoff-destinations-query.dto';
import { WriteoffDestinationsService } from './writeoff-destinations.service';

@Controller('writeoff-destinations')
export class WriteoffDestinationsController {
  constructor(private readonly destinations: WriteoffDestinationsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: WriteoffDestinationsQueryDto) {
    return this.destinations.list(query);
  }

  @Roles(...ADMIN_MANAGER)
  @Post()
  create(@Body() dto: CreateWriteoffDestinationDto, @CurrentUser() actor: JwtUser) {
    return this.destinations.create(dto, actor.userId);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWriteoffDestinationDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.destinations.update(id, dto, actor.userId);
  }

  @Roles(...ADMIN_MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.destinations.remove(id, actor.userId);
  }
}
