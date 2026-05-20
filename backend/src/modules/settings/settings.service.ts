import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { PatchSettingsDto } from './dto/patch-settings.dto';
import {
  DEFAULT_SYSTEM_SETTINGS,
  type SystemSettingsPayload,
} from './settings.types';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async get(): Promise<SystemSettingsPayload> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });
    if (!row) return { ...DEFAULT_SYSTEM_SETTINGS };
    return { ...DEFAULT_SYSTEM_SETTINGS, ...(row.payload as SystemSettingsPayload) };
  }

  async patch(
    dto: PatchSettingsDto,
    actorId?: string,
    actorEmail?: string,
  ): Promise<SystemSettingsPayload> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });
    const raw = (row?.payload ?? {}) as Record<string, unknown>;
    const mailBlock = raw.mail;
    const current = await this.get();
    const next: SystemSettingsPayload = { ...current, ...dto };
    const payload = { ...raw, ...next, mail: mailBlock } as unknown as Prisma.InputJsonValue;

    await this.prisma.systemSetting.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        payload,
        updatedBy: actorEmail ?? actorId ?? null,
      },
      update: {
        payload,
        updatedBy: actorEmail ?? actorId ?? null,
      },
    });

    await this.auditLog.write({
      actorId,
      action: 'settings.update',
      entityType: 'system_settings',
      entityId: 'default',
      metadata: { changes: JSON.parse(JSON.stringify(dto)) },
    });

    return next;
  }
}
