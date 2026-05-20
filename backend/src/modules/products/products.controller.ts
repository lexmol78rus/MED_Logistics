import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.products.list(query);
  }
}
