import type { UserRole } from '@prisma/client';
import type { PermissionOverrides } from '../rbac/permission-catalog';

export interface JwtUser {
  userId: string;
  email: string;
  role: UserRole;
  permissions: PermissionOverrides | null;
}
