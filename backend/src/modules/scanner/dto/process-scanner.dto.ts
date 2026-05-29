import { IsString, MaxLength, MinLength } from 'class-validator';

export class ProcessScannerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  barcode!: string;
}
