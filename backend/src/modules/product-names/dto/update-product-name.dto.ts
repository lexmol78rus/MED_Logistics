import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProductNameDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;
}
