import { ShipmentPickingOutcome } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CompleteShipmentPickingDto {
  @IsEnum(ShipmentPickingOutcome)
  outcome!: ShipmentPickingOutcome;

  @IsString()
  @MinLength(3)
  comment!: string;
}
