import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CorrectWriteoffLineDto {
  @IsString()
  reference!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  newQuantity?: number;

  @IsOptional()
  @IsBoolean()
  remove?: boolean;
}

export class CorrectWriteoffAdditionDto {
  @IsString()
  productId!: string;

  @IsString()
  lotId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsString()
  writeOffDestinationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  writeOffComment?: string;
}

export class CorrectWriteoffGroupDto {
  @IsOptional()
  @IsString()
  operationGroupId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  movementReferences?: string[];

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  editReason!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectWriteoffLineDto)
  updates?: CorrectWriteoffLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectWriteoffAdditionDto)
  additions?: CorrectWriteoffAdditionDto[];
}
