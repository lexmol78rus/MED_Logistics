import { UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Sparse overrides: only keys that differ from role defaults. null clears all. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsObject()
  permissions?: Record<string, boolean> | null;
}
