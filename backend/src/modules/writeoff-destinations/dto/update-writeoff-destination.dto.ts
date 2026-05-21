import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWriteoffDestinationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
