import { BadRequestException, Body, Controller, Get, Param, Put } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ADMIN_ONLY, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ROLE_PERMISSION_DEFAULTS } from '../../common/rbac/permission-catalog';
import { SetRoleTemplateDto } from './dto/set-role-template.dto';
import { RolePermissionsService } from './role-permissions.service';

@Controller('role-permissions')
export class RolePermissionsController {
  constructor(private readonly rolePermissions: RolePermissionsService) {}

  @Roles(...READ_ROLES)
  @Get()
  async list() {
    const templates = await this.rolePermissions.getTemplates();
    return {
      templates,
      builtinDefaults: ROLE_PERMISSION_DEFAULTS,
    };
  }

  @Roles(...ADMIN_ONLY)
  @Put(':role')
  async setTemplate(
    @Param('role') role: string,
    @Body() dto: SetRoleTemplateDto,
    @CurrentUser() actor: JwtUser,
  ) {
    const parsed = role as UserRole;
    if (!Object.values(UserRole).includes(parsed)) {
      throw new BadRequestException('Unknown role');
    }
    const templates = await this.rolePermissions.setTemplate(
      parsed,
      dto.permissions ?? null,
      actor.userId,
    );
    return { templates };
  }
}
