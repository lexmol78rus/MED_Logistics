import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class QuickCreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  barcode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string;
}
