import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: NotificationsQueryDto, @CurrentUser() user?: JwtUser) {
    return this.notifications.list(query, user?.userId);
  }

  @Roles(...READ_ROLES)
  @Patch('read-all')
  markAllRead(@CurrentUser() user?: JwtUser) {
    return this.notifications.markAllRead(user?.userId);
  }

  @Roles(...READ_ROLES)
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    return this.notifications.markRead(id, user?.userId);
  }
}
