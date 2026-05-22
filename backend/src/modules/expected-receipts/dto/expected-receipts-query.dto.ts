import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ExpectedReceiptStatus } from '@prisma/client';
import { SearchPaginationQueryDto } from '../../../common/dto/search-pagination-query.dto';

export class ExpectedReceiptsQueryDto extends SearchPaginationQueryDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsEnum(ExpectedReceiptStatus)
  status?: ExpectedReceiptStatus;

  /** Only ORDERED + PARTIALLY_RECEIVED */
  @IsOptional()
  @Type(() => Boolean)
  activeOnly?: boolean;
}
