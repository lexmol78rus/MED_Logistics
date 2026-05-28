import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class WriteoffLineDto {
  @IsString()
  lotId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}

export class WriteoffInventoryDto {
  @IsString()
  productId!: string;

  @IsString()
  writeOffDestinationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  writeOffComment?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WriteoffLineDto)
  lines!: WriteoffLineDto[];

  /** false = списание без FEFO-рекомендаций (ручной выбор партий) */
  @IsOptional()
  @Transform(({ value }) => value !== 'false' && value !== false)
  @IsBoolean()
  useFefoRecommendations?: boolean;

  @IsOptional()
  @IsString()
  shipmentId?: string;
}
