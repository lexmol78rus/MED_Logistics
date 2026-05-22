import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsNotPastDate } from '../../../common/validators/is-not-past-date.validator';

export class ReceiveInventoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  barcode?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lotNumber!: string;

  @IsDateString()
  @IsNotPastDate()
  expiryDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  location?: string;

  /** Link this receive to an active expected receipt (partial receive supported). */
  @IsOptional()
  @IsString()
  expectedReceiptId?: string;
}
