import { Module } from '@nestjs/common';
import { ExpiryModule } from '../expiry/expiry.module';
import { InventoryModule } from '../inventory/inventory.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [InventoryModule, ExpiryModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
