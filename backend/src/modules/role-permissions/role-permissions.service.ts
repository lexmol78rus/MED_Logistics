import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import {
  sanitizePermissionOverrides,
  type PermissionOverrides,
} from '../../common/rbac/permission-catalog';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

export const ROLE_PERMISSION_TEMPLATES_KEY = 'rolePermissionTemplates';

export type RolePermissionTemplatesMap = Record<
  UserRole,
  PermissionOverrides | null
>;

const ALL_ROLES_LIST: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OPERATOR,
  UserRole.ACCOUNTANT,
  UserRole.VIEWER,
];

function emptyTemplates(): RolePermissionTemplatesMap {
  return Object.fromEntries(
    ALL_ROLES_LIST.map((r) => [r, null]),
  ) as RolePermissionTemplatesMap;
}

@Injectable()
export class RolePermissionsService {
  private cache: RolePermissionTemplatesMap | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async getTemplates(): Promise<RolePermissionTemplatesMap> {
    if (this.cache) {
      return this.cache;
    }
    const row = await this.prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });
    const base = emptyTemplates();
    if (!row?.payload || typeof row.payload !== 'object') {
      this.cache = base;
      return base;
    }
    const raw = (row.payload as Record<string, unknown>)[ROLE_PERMISSION_TEMPLATES_KEY];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      this.cache = base;
      return base;
    }
    for (const role of ALL_ROLES_LIST) {
      const entry = (raw as Record<string, unknown>)[role];
      base[role] = sanitizePermissionOverrides(entry);
    }
    this.cache = base;
    return base;
  }

  async getTemplateForRole(role: UserRole): Promise<PermissionOverrides | null> {
    const templates = await this.getTemplates();
    return templates[role] ?? null;
  }

  async setTemplate(
    role: UserRole,
    permissions: PermissionOverrides | null,
    actorId: string,
  ): Promise<RolePermissionTemplatesMap> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });
    const payload =
      row?.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? { ...(row.payload as Record<string, unknown>) }
        : {};

    const currentRaw = payload[ROLE_PERMISSION_TEMPLATES_KEY];
    const current =
      currentRaw && typeof currentRaw === 'object' && !Array.isArray(currentRaw)
        ? { ...(currentRaw as Record<string, unknown>) }
        : {};

    const sanitized = sanitizePermissionOverrides(permissions);
    if (sanitized) {
      current[role] = sanitized;
    } else {
      delete current[role];
    }

    payload[ROLE_PERMISSION_TEMPLATES_KEY] = current;

    const jsonPayload = payload as unknown as Prisma.InputJsonValue;

    await this.prisma.systemSetting.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        payload: jsonPayload,
        updatedBy: actorId,
      },
      update: {
        payload: jsonPayload,
        updatedBy: actorId,
      },
    });

    this.cache = null;

    await this.audit.write({
      actorId,
      action: 'role_permissions.update',
      entityType: 'role_permissions',
      entityId: role,
      metadata: { role, keys: sanitized ? Object.keys(sanitized).length : 0 },
    });

    return this.getTemplates();
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
