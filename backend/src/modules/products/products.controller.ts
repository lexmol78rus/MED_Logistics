import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ADMIN_MANAGER, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ProductsQueryDto } from './dto/products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: ProductsQueryDto) {
    return this.products.list(query);
  }

  @Roles(...READ_ROLES)
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.products.getById(id);
  }

  @Roles(...ADMIN_MANAGER)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.products.update(id, dto, user?.email);
  }
}
