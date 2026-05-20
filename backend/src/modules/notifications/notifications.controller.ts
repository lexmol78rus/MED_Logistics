import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.notifications.list(query);
  }
}
