import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { ExpectedReceiptsModule } from '../expected-receipts/expected-receipts.module';
import { SettingsModule } from '../settings/settings.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [InventoryModule, ExpectedReceiptsModule, SettingsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
