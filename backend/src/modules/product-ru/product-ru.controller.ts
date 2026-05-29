import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ADMIN_MANAGER, ADMIN_MANAGER_OPERATOR, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ProductRuService } from './product-ru.service';

@Controller('products/:productId/ru')
export class ProductRuController {
  constructor(private readonly productRu: ProductRuService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Param('productId') productId: string) {
    return this.productRu.list(productId);
  }

  @Roles(...ADMIN_MANAGER_OPERATOR)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('originalName') originalName: string | undefined,
    @CurrentUser() user: JwtUser,
  ) {
    return this.productRu.upload(productId, file, user.email, originalName);
  }

  @Roles(...READ_ROLES)
  @Get(':certId/file')
  async download(
    @Param('productId') productId: string,
    @Param('certId') certId: string,
  ) {
    const { stream } = await this.productRu.getFile(productId, certId);
    return stream;
  }

  @Roles(...ADMIN_MANAGER)
  @Delete(':certId')
  remove(
    @Param('productId') productId: string,
    @Param('certId') certId: string,
  ) {
    return this.productRu.remove(productId, certId);
  }
}
