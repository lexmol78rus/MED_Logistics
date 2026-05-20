import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /** Readiness includes database connectivity (Docker / orchestrator probes). */
  @Public()
  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'up' };
  }
}
