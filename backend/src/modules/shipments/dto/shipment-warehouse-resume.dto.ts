import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ShipmentWarehouseResumeDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Комментарий — не короче 3 символов' })
  @MaxLength(2000)
  comment?: string;
}
