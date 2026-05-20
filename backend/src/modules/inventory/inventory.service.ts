import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class InventoryService {
  /** Placeholder — stock levels and allocation live in this module long-term. */
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
