import { IsObject, IsOptional } from 'class-validator';

export class SetRoleTemplateDto {
  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean> | null;
}
