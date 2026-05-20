import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WriteoffRecommendationQueryDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
