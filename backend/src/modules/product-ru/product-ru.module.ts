import { Module } from '@nestjs/common';
import { ProductRuController } from './product-ru.controller';
import { ProductRuService } from './product-ru.service';

@Module({
  controllers: [ProductRuController],
  providers: [ProductRuService],
})
export class ProductRuModule {}
