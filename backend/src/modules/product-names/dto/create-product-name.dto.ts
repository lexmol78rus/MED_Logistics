import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProductNameDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;
}
