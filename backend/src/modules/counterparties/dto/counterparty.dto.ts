import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CounterpartyType } from '@prisma/client';

export class CreateCounterpartyDto {
  @IsEnum(CounterpartyType)
  type!: CounterpartyType;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  inn?: string;

  @IsOptional()
  @IsString()
  kpp?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateCounterpartyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string | null;

  @IsOptional()
  @IsString()
  inn?: string;

  @IsOptional()
  @IsString()
  kpp?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

