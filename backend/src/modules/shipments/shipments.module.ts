import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ShipmentsController } from './shipments.controller';
import { ShipmentAssemblyReservationService } from './shipment-assembly-reservation.service';
import { ShipmentsService } from './shipments.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, ShipmentAssemblyReservationService],
  exports: [ShipmentsService, ShipmentAssemblyReservationService],
})
export class ShipmentsModule {}

