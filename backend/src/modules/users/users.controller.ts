import { Controller, Get } from '@nestjs/common';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  @Get('me')
  getAuthenticatedProfile(@CurrentUser() user: JwtUser) {
    return { user };
  }
}
