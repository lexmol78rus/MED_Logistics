import type { UserRole } from '@prisma/client';

export interface JwtUser {
  userId: string;
  email: string;
  role: UserRole;
}
