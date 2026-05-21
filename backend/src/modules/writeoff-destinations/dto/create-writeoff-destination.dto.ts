import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWriteoffDestinationDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;
}
