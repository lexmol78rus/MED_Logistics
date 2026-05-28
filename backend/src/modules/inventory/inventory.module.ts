import { Module } from '@nestjs/common';
import { ScannerModule } from '../scanner/scanner.module';
import { SettingsModule } from '../settings/settings.module';
import { WriteoffDestinationsModule } from '../writeoff-destinations/writeoff-destinations.module';
import { ExpectedReceiptsModule } from '../expected-receipts/expected-receipts.module';
import { ShipmentsModule } from '../shipments/shipments.module';
import { InventoryBalanceService } from './inventory-balance.service';
import { InventoryValidationService } from './inventory-validation.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [ScannerModule, SettingsModule, WriteoffDestinationsModule, ExpectedReceiptsModule, ShipmentsModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryBalanceService, InventoryValidationService],
  exports: [InventoryBalanceService, InventoryValidationService],
})
export class InventoryModule {}
