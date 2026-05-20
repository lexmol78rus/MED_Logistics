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
import { ADMIN_ONLY, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(...READ_ROLES)
  @Get('me')
  getAuthenticatedProfile(@CurrentUser() user: JwtUser) {
    return { user };
  }

  @Roles(...ADMIN_ONLY)
  @Get()
  list(@Query() query: UsersQueryDto) {
    return this.users.list(query);
  }

  @Roles(...ADMIN_ONLY)
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: JwtUser) {
    return this.users.create(dto, actor.userId);
  }

  @Roles(...ADMIN_ONLY)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.users.update(id, dto, actor.userId);
  }

  @Roles(...ADMIN_ONLY)
  @Post(':id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.users.resetPassword(id, dto.password, actor.userId);
  }

  @Roles(...ADMIN_ONLY)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.users.softDelete(id, actor.userId);
  }
}
