import { IsString, MaxLength, MinLength } from 'class-validator';

export class ShipmentWarehouseCommentDto {
  @IsString()
  @MinLength(3, { message: 'Комментарий для склада — не короче 3 символов' })
  @MaxLength(2000)
  comment!: string;
}
