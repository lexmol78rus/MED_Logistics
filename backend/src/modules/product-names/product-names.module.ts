import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ProductNamesController } from './product-names.controller';
import { ProductNamesService } from './product-names.service';

@Module({
  imports: [AuditModule],
  controllers: [ProductNamesController],
  providers: [ProductNamesService],
  exports: [ProductNamesService],
})
export class ProductNamesModule {}
