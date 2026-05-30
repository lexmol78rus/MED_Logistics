import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  sanitizePermissionOverrides,
  type PermissionOverrides,
} from '../../common/rbac/permission-catalog';
import { notDeletedUserWhere } from '../../common/utils/not-deleted-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from './dto/users-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, ...notDeletedUserWhere },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
      },
    });
    if (!user) return null;
    return {
      ...user,
      permissions: sanitizePermissionOverrides(user.permissions),
    };
  }

  findByEmailForAuth(email: string) {
    return this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), ...notDeletedUserWhere },
      select: {
        id: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        passwordHash: true,
      },
    });
  }

  async list(query: UsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;
    const search = query.search?.trim();

    const where = {
      ...notDeletedUserWhere,
      ...(search
        ? { email: { contains: search, mode: 'insensitive' as const } }
        : {}),
      ...(query.role ? { role: query.role as UserRole } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          permissions: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        permissions: sanitizePermissionOverrides(u.permissions),
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateUserDto, actorId: string) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email, ...notDeletedUserWhere },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: dto.displayName?.trim() || null,
        passwordHash,
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.audit.write({
      actorId,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { id, ...notDeletedUserWhere },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    let permissionsPatch: PermissionOverrides | null | undefined;
    if (dto.permissions !== undefined) {
      permissionsPatch = sanitizePermissionOverrides(dto.permissions);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName.trim() || null }
          : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(permissionsPatch !== undefined
          ? {
              permissions:
                permissionsPatch === null
                  ? Prisma.DbNull
                  : (permissionsPatch as Prisma.InputJsonValue),
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        updatedAt: true,
      },
    });

    if (dto.role !== undefined && dto.role !== existing.role) {
      await this.audit.write({
        actorId,
        action: 'user.role_change',
        entityType: 'user',
        entityId: id,
        metadata: { from: existing.role, to: dto.role, email: existing.email },
      });
    }

    if (permissionsPatch !== undefined) {
      await this.audit.write({
        actorId,
        action: 'user.permissions_change',
        entityType: 'user',
        entityId: id,
        metadata: { email: existing.email },
      });
    }

    if (dto.isActive === false && existing.isActive) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
      await this.audit.write({
        actorId,
        action: 'user.disable',
        entityType: 'user',
        entityId: id,
        metadata: { email: existing.email },
      });
    }

    if (dto.isActive === true && !existing.isActive) {
      await this.audit.write({
        actorId,
        action: 'user.enable',
        entityType: 'user',
        entityId: id,
        metadata: { email: existing.email },
      });
    }

    return {
      ...user,
      permissions: sanitizePermissionOverrides(user.permissions),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async resetPassword(id: string, password: string, actorId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { id, ...notDeletedUserWhere },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
    ]);

    await this.audit.write({
      actorId,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: id,
      metadata: { email: existing.email },
    });

    return { success: true };
  }

  async softDelete(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('Cannot delete current user');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id, ...notDeletedUserWhere },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (existing.role === UserRole.ADMIN) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          ...notDeletedUserWhere,
          role: UserRole.ADMIN,
          isActive: true,
        },
      });
      if (activeAdminCount <= 1) {
        throw new BadRequestException('Cannot delete last administrator');
      }
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
    ]);

    await this.audit.write({
      actorId,
      action: 'USER_DELETE',
      entityType: 'user',
      entityId: id,
      metadata: { email: existing.email },
    });

    return { success: true };
  }
}
