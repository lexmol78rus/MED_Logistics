import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { JwtUser } from '../interfaces/jwt-user.interface';
import { userHasPermission } from '../rbac/resolve-permission';
import { resolveRoutePermission } from '../rbac/route-permissions';
import { RolePermissionsService } from '../../modules/role-permissions/role-permissions.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: JwtUser;
      method: string;
      url: string;
    }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const apiPrefix = this.config.get<string>('apiPrefix') ?? 'api/v1';
    const routePermission = resolveRoutePermission(
      request.method,
      request.url,
      apiPrefix,
    );
    if (routePermission) {
      const templates = await this.rolePermissions.getTemplates();
      const roleTemplate = templates[user.role] ?? null;
      if (
        !userHasPermission(
          user.role,
          routePermission,
          user.permissions,
          roleTemplate,
        )
      ) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
