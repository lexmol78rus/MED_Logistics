import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Query,
  Res,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { ADMIN_MANAGER, ADMIN_MANAGER_OPERATOR } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AuditLogService } from '../audit/audit-log.service';
import { ShiftReportQueryDto } from './dto/shift-report-query.dto';
import { ExportService } from './export.service';
import { ShiftReportService } from './shift-report.service';

@Controller('export')
@Roles(...ADMIN_MANAGER)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly shiftReportService: ShiftReportService,
    private readonly audit: AuditLogService,
  ) {}

  @Get('products')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async products(
    @Query('format') format: string,
    @Res() res: Response,
    @CurrentUser() user: JwtUser,
  ) {
    await this.audit.write({
      actorId: user.userId,
      action: 'export.products',
      entityType: 'export',
      metadata: { format: format ?? 'csv' },
    });
    const csv = await this.exportService.productsCsv();
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    res.setHeader('Content-Disposition', `attachment; filename="products.${ext}"`);
    res.send(csv);
  }

  @Get('lots')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async lots(@Query('format') format: string, @Res() res: Response) {
    const csv = await this.exportService.lotsCsv();
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    res.setHeader('Content-Disposition', `attachment; filename="lots.${ext}"`);
    res.send(csv);
  }

  @Get('movements')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async movements(
    @Query('format') format: string,
    @Query('today') today: string,
    @Res() res: Response,
  ) {
    const isToday = today === 'true';
    const csv = await this.exportService.movementsCsv({ today: isToday });
    const date = new Date().toISOString().slice(0, 10);
    const filename = isToday ? `movements_shift_${date}.csv` : 'movements.csv';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('expiry')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async expiry(@Query('format') format: string, @Res() res: Response) {
    const csv = await this.exportService.expiryCsv();
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    res.setHeader('Content-Disposition', `attachment; filename="expiry.${ext}"`);
    res.send(csv);
  }

  /** Отчёт смены — PDF по действиям текущего пользователя за выбранный период. */
  @Get('shift-report')
  @Roles(...ADMIN_MANAGER_OPERATOR)
  async shiftReport(
    @Query() query: ShiftReportQueryDto,
    @CurrentUser() user: JwtUser,
    @Res() res: Response,
  ) {
    const targetUserId = query.userId?.trim() || user.userId;
    const forOtherEmployee = targetUserId !== user.userId;

    if (
      forOtherEmployee &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException(
        'Только администратор или менеджер может формировать отчёт другого сотрудника',
      );
    }

    const { buffer, filename } = await this.shiftReportService.generatePdf(
      targetUserId,
      query.from,
      query.to,
    );
    await this.audit.write({
      actorId: user.userId,
      action: forOtherEmployee ? 'export.shift_report.admin' : 'export.shift_report',
      entityType: 'export',
      metadata: {
        from: query.from,
        to: query.to,
        targetUserId,
      },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
