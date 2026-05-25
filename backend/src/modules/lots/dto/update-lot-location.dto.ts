import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLotLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;
}
