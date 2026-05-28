import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateContractMetaDto {
  @IsString()
  @MinLength(1)
  number!: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class UpdateContractMetaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  number?: string;

  @IsOptional()
  @IsDateString()
  date?: string | null;

  @IsOptional()
  @IsString()
  title?: string | null;
}

