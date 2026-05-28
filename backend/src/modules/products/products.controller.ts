import { Body, Controller, Delete, Get, Param, Patch, Post, Query, ForbiddenException } from '@nestjs/common';
import {
  ADMIN_MANAGER,
  ADMIN_MANAGER_OPERATOR,
  ADMIN_ONLY,
  READ_ROLES,
} from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ProductsQueryDto } from './dto/products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QuickCreateProductDto } from './dto/quick-create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { PurgeAllProductsDto } from './dto/purge-all-products.dto';

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

  @Roles(...ADMIN_MANAGER_OPERATOR)
  @Post('quick-create')
  quickCreate(@Body() dto: QuickCreateProductDto) {
    return this.products.quickCreate(dto);
  }

  /** Debug-only: delete product and dependencies (admin only). */
  @Roles(...ADMIN_ONLY)
  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Query('force') force?: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.products.deleteProduct(id, user?.email, force === 'true' || force === '1');
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

  /**
   * Dangerous operation. Intended for initial go-live cleanup of test nomenclature.
   * Guarded by:
   * - ADMIN role
   * - explicit env toggle
   * - explicit confirmation phrase
   */
  @Roles(...ADMIN_ONLY)
  @Post('purge-all')
  async purgeAll(@Body() dto: PurgeAllProductsDto, @CurrentUser() user?: JwtUser) {
    if (process.env.ALLOW_NOMENCLATURE_PURGE !== 'true') {
      throw new ForbiddenException(
        'Операция отключена. Установите ALLOW_NOMENCLATURE_PURGE=true в окружении',
      );
    }
    return this.products.purgeAllProducts(dto, user?.email);
  }
}
