import { LotStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateLotStatusDto {
  @IsEnum(LotStatus)
  status!: LotStatus;

  /** При блокировке с экрана отзыва — тип движения RECALL */
  @IsOptional()
  @IsBoolean()
  recall?: boolean;
}
