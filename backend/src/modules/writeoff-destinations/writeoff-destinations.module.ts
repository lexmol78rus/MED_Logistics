import { Module } from '@nestjs/common';
import { WriteoffDestinationsController } from './writeoff-destinations.controller';
import { WriteoffDestinationsService } from './writeoff-destinations.service';

@Module({
  controllers: [WriteoffDestinationsController],
  providers: [WriteoffDestinationsService],
  exports: [WriteoffDestinationsService],
})
export class WriteoffDestinationsModule {}
