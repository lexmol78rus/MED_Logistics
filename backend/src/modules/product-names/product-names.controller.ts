import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ADMIN_MANAGER, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateProductNameDto } from './dto/create-product-name.dto';
import { ProductNamesQueryDto } from './dto/product-names-query.dto';
import { SuggestProductNamesDto } from './dto/suggest-product-names.dto';
import { UpdateProductNameDto } from './dto/update-product-name.dto';
import { ProductNamesService } from './product-names.service';

@Controller('product-names')
export class ProductNamesController {
  constructor(private readonly productNames: ProductNamesService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: ProductNamesQueryDto) {
    return this.productNames.list(query);
  }

  @Roles(...READ_ROLES)
  @Get('suggest')
  suggest(@Query() query: SuggestProductNamesDto) {
    return this.productNames.suggest(query.q, query.limit ?? 12);
  }

  @Roles(...ADMIN_MANAGER)
  @Post()
  create(@Body() dto: CreateProductNameDto, @CurrentUser() actor: JwtUser) {
    return this.productNames.create(dto, actor.userId);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductNameDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.productNames.update(id, dto, actor.userId);
  }

  @Roles(...ADMIN_MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.productNames.remove(id, actor.userId);
  }
}
