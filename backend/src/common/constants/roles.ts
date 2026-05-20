import { UserRole } from '@prisma/client';

/** All authenticated roles */
export const ALL_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OPERATOR,
  UserRole.VIEWER,
];

export const READ_ROLES = ALL_ROLES;

export const MUTATE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OPERATOR,
];

export const ADMIN_ONLY: UserRole[] = [UserRole.ADMIN];

export const ADMIN_MANAGER: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];

export const ADMIN_MANAGER_OPERATOR: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OPERATOR,
];
