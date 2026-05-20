import { IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '../../../common/dto/search-pagination-query.dto';

export class UsersQueryDto extends SearchPaginationQueryDto {
  @IsOptional()
  @IsString()
  role?: string;
}
