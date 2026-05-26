import { IsString, MaxLength, MinLength } from 'class-validator';

/** Комментарий к действию над ожиданием (подтверждение, отмена). */
export class ExpectedReceiptActionCommentDto {
  @IsString()
  @MinLength(2, { message: 'Комментарий не короче 2 символов' })
  @MaxLength(500)
  comment!: string;
}
