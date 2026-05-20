import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class NotificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  unreadOnly?: boolean;
}
