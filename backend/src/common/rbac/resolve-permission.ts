import { UserRole } from '@prisma/client';
import {
  PermissionKey,
  PermissionOverrides,
  resolvePermission,
} from './permission-catalog';

export function userHasPermission(
  role: UserRole,
  key: PermissionKey,
  userOverrides?: PermissionOverrides | null,
  roleTemplate?: PermissionOverrides | null,
): boolean {
  return resolvePermission(role, key, userOverrides, roleTemplate);
}
