import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class VoidLotDto {
  /** Причина удаления ошибочно созданной партии (обязательно). */
  @IsString()
  @MinLength(5, { message: 'Комментарий не короче 5 символов' })
  @MaxLength(2000)
  comment!: string;

  /**
   * LOT партии-получателя (тот же товар). Обязателен, если на ошибочной партии есть остаток.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  transferToLotNumber?: string;
}
