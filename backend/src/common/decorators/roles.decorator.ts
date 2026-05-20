import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restrict endpoint to specific roles. Omit = any authenticated role. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
