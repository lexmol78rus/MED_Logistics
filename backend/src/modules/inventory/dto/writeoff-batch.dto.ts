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

class WriteoffBatchLineDto {
  @IsString()
  lotId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}

export class WriteoffBatchItemDto {
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
  @Type(() => WriteoffBatchLineDto)
  lines!: WriteoffBatchLineDto[];

  @IsOptional()
  @Transform(({ value }) => value !== 'false' && value !== false)
  @IsBoolean()
  useFefoRecommendations?: boolean;
}

export class WriteoffBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WriteoffBatchItemDto)
  items!: WriteoffBatchItemDto[];
}
