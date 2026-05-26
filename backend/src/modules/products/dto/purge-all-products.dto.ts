import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PurgeAllProductsDto {
  /**
   * Required confirmation phrase to prevent accidental deletion.
   */
  @IsString()
  confirm!: string;

  /**
   * If true, only returns what would be deleted.
   */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

