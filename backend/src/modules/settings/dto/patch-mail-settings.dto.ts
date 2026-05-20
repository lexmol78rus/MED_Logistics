import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class PatchMailSmtpDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  host?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  user?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  from?: string;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  /** Empty string clears stored password; omit to keep existing. */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  password?: string;
}

export class PatchMailNotificationsDto {
  @IsOptional()
  @IsBoolean()
  passwordReset?: boolean;

  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  @IsBoolean()
  expiryCritical?: boolean;

  @IsOptional()
  @IsBoolean()
  lotBlocked?: boolean;

  @IsOptional()
  @IsBoolean()
  lotRecall?: boolean;

  @IsOptional()
  @IsBoolean()
  authFailed?: boolean;

  @IsOptional()
  @IsBoolean()
  system?: boolean;
}

export class PatchMailSettingsDto {
  @IsOptional()
  smtp?: PatchMailSmtpDto;

  @IsOptional()
  notifications?: PatchMailNotificationsDto;
}

export class TestMailDto {
  @IsEmail()
  to!: string;
}
