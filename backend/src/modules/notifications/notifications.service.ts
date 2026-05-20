import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class NotificationsService {
  /** Placeholder — outbound channels and read state handled here. */
  list(_query: PaginationQueryDto) {
    void _query;
    return {
      items: [] as unknown[],
      total: 0,
      page: _query.page ?? 1,
      pageSize: _query.pageSize ?? 20,
    };
  }
}
