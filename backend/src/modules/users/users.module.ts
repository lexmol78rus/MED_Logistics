import { Module } from '@nestjs/common';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RolePermissionsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
