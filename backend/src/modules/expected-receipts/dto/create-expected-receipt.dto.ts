import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateExpectedReceiptDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  orderedQty!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
