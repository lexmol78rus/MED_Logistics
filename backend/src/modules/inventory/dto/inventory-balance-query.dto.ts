import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { LotStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class InventoryBalanceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  lotId?: string;

  @IsOptional()
  @IsEnum(LotStatus)
  status?: LotStatus;

  @IsOptional()
  @IsDateString()
  expiryBefore?: string;

  @IsOptional()
  @IsDateString()
  expiryAfter?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
