import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class PatchSettingsDto {
  @IsOptional()
  @IsString()
  warehouseName?: string;

  @IsOptional()
  @IsString()
  warehouseCode?: string;

  @IsOptional()
  @IsBoolean()
  fefoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  fefoStrict?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  expiryWarningDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  expiryCriticalDays?: number;

  @IsOptional()
  @IsBoolean()
  scannerAutoFocus?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5000)
  scannerDebounceMs?: number;

  @IsOptional()
  @IsBoolean()
  scannerSoundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  uiCompactMode?: boolean;

  @IsOptional()
  @IsBoolean()
  uiShowFefoHints?: boolean;

  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  uiAnimations?: boolean;

  @IsOptional()
  @IsBoolean()
  uiAutoRefreshDashboard?: boolean;
}
