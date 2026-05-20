import { IsIn, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '../../../common/dto/search-pagination-query.dto';

export class ExpiryQueryDto extends SearchPaginationQueryDto {
  @IsOptional()
  @IsIn(['expired', 'lt30', 'lt90', 'all'])
  filter?: 'expired' | 'lt30' | 'lt90' | 'all';

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
