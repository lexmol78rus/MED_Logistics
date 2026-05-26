import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ShiftReportQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  /** Только для ADMIN: отчёт по другому сотруднику. */
  @IsOptional()
  @IsString()
  userId?: string;
}
