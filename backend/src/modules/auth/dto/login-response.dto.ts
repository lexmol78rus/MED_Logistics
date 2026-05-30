import type { PermissionOverrides } from '../../../common/rbac/permission-catalog';
import type { RolePermissionTemplatesMap } from '../../role-permissions/role-permissions.service';

export type LoginResponseDto = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    permissions: PermissionOverrides | null;
  };
  roleTemplates: RolePermissionTemplatesMap;
};
