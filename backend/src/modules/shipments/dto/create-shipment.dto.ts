import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateShipmentItemDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  vatRate?: string;

  @IsOptional()
  @IsString()
  priceWithVat?: string;

  @IsString()
  @MinLength(1)
  quantity!: string;

  @IsOptional()
  @IsString()
  sum?: string;

  @IsOptional()
  @Min(0)
  contractLineNo?: number;

  @IsOptional()
  @IsString()
  managerNote?: string;

  @IsOptional()
  @IsString()
  managerTag?: string;
}

export class CreateShipmentDto {
  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShipmentItemDto)
  items!: CreateShipmentItemDto[];
}

