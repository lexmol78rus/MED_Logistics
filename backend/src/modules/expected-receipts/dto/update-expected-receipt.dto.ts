import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateExpectedReceiptDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  orderedQty?: number;

  /** Причина корректировки (попадает в историю). */
  @IsString()
  @MinLength(2, { message: 'Укажите причину изменения (не короче 2 символов)' })
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
