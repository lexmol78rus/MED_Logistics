import { Injectable } from '@nestjs/common';
import { LotStatus, NotificationPriority, Prisma } from '@prisma/client';
import {
  EmailNotificationService,
  type EmailNotificationEvent,
} from '../mail/email-notification.service';
import { decimalToNumber } from '../../common/utils/decimal.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { InventoryBalanceService } from '../inventory/inventory-balance.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

export type NotificationItem = {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  href?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly balance: InventoryBalanceService,
    private readonly emailNotifications: EmailNotificationService,
  ) {}

  async list(query: NotificationsQueryDto, userId?: string) {
    await this.syncOperationalNotifications(userId);

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 50);
    const where: Prisma.NotificationWhereInput = {
      OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ readAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((n) => this.toItem(n)),
      total,
      page,
      pageSize,
      unreadCount: await this.prisma.notification.count({
        where: { ...where, readAt: null },
      }),
    };
  }

  async markRead(id: string, userId?: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n) return { success: false };
    if (n.userId && n.userId !== userId) return { success: false };

    await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllRead(userId?: string) {
    await this.prisma.notification.updateMany({
      where: {
        readAt: null,
        OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
      },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  private async syncOperationalNotifications(userId?: string): Promise<void> {
    const cfg = await this.settings.get();
    if (!cfg.notificationEnabled) return;

    const now = new Date();
    const criticalDays = cfg.expiryCriticalDays;
    const inCritical = new Date(now.getTime() + criticalDays * DAY_MS);

    const expiringLots = await this.prisma.lot.findMany({
      where: {
        expiryDate: { lte: inCritical },
        inventoryRows: { some: { quantity: { gt: 0 } } },
      },
      take: 20,
      orderBy: { expiryDate: 'asc' },
      include: { product: { select: { name: true } } },
    });

    for (const lot of expiringLots) {
      const days = lot.expiryDate
        ? Math.ceil((lot.expiryDate.getTime() - now.getTime()) / DAY_MS)
        : 0;
      const priority =
        days <= 0 ? NotificationPriority.CRITICAL : NotificationPriority.HIGH;
      await this.upsertByKey(
        `exp-${lot.id}`,
        {
          userId: null,
          type: 'expiring',
          priority,
          title: 'Истекает срок годности',
          message: `${lot.product.name} (${lot.lotNumber}) — ${days} дн.`,
          href: '/expiry-control',
        },
        priority === NotificationPriority.CRITICAL
          ? {
              event: 'expiry_critical',
              title: 'Критичный срок годности',
              message: `${lot.product.name} (${lot.lotNumber}) — ${days} дн.`,
              href: '/expiry-control',
            }
          : undefined,
      );
    }

    for (const status of [LotStatus.BLOCKED, LotStatus.QUARANTINE] as const) {
      const lots = await this.prisma.lot.findMany({
        where: { status },
        take: 10,
        include: { product: { select: { name: true } } },
      });
      for (const lot of lots) {
        const type = status === LotStatus.BLOCKED ? 'blocked' : 'quarantine';
        const title =
          status === LotStatus.BLOCKED ? 'Партия заблокирована' : 'Карантин партии';
        await this.upsertByKey(
          `${type}-${lot.id}`,
          {
            userId: null,
            type,
            priority: NotificationPriority.HIGH,
            title,
            message: `${lot.product.name} — ${lot.lotNumber}`,
            href:
              status === LotStatus.BLOCKED
                ? '/recall'
                : `/lots?search=${encodeURIComponent(lot.lotNumber)}`,
          },
          status === LotStatus.BLOCKED
            ? {
                event: 'lot_blocked',
                title,
                message: `${lot.product.name} — ${lot.lotNumber}`,
                href: '/recall',
              }
            : undefined,
        );
      }
    }

    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { minStock: { not: null } },
          { reorderPoint: { not: null } },
        ],
      },
      take: 100,
    });

    for (const p of products) {
      const bal = await this.balance.getProductBalance(p.id);
      const threshold = p.reorderPoint ?? p.minStock;
      if (threshold == null) continue;
      const limit = decimalToNumber(threshold);
      if (bal.availableQuantity > 0 && bal.availableQuantity <= limit) {
        await this.upsertByKey(
          `low-${p.id}`,
          {
            userId: null,
            type: 'low_stock',
            priority: NotificationPriority.NORMAL,
            title: 'Низкий остаток',
            message: `${p.name} (${p.sku}) — ${bal.availableQuantity} шт. (порог ${limit})`,
            href: `/products/${p.id}`,
          },
          {
            event: 'low_stock',
            title: 'Низкий остаток',
            message: `${p.name} (${p.sku}) — ${bal.availableQuantity} шт. (порог ${limit})`,
            href: `/products/${p.id}`,
          },
        );
      }
    }

    const failedLogins = await this.prisma.auditLog.findMany({
      where: { action: 'auth.login_failed' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const log of failedLogins) {
      const age = now.getTime() - log.createdAt.getTime();
      if (age > 7 * DAY_MS) continue;
      const failMessage = String(
        (log.metadata as { email?: string })?.email ?? 'неизвестный пользователь',
      );
      await this.upsertByKey(
        `login-fail-${log.id}`,
        {
          userId: userId ?? null,
          type: 'failed_login',
          priority: NotificationPriority.HIGH,
          title: 'Неудачный вход',
          message: failMessage,
          href: '/users',
        },
        {
          event: 'auth_failed',
          title: 'Ошибка авторизации',
          message: `Неудачный вход: ${failMessage}`,
          href: '/users',
        },
      );
    }

    const fefoViolations = await this.prisma.auditLog.findMany({
      where: { action: 'inventory.fefo.violation' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const log of fefoViolations) {
      await this.upsertByKey(`fefo-${log.id}`, {
        userId: null,
        type: 'fefo_violation',
        priority: NotificationPriority.CRITICAL,
        title: 'Нарушение FEFO',
        message: `Продукт ${log.entityId ?? '—'}`,
        href: '/write-off',
      });
    }
  }

  private async upsertByKey(
    key: string,
    data: {
      userId: string | null;
      type: string;
      priority: NotificationPriority;
      title: string;
      message: string;
      href?: string;
    },
    email?: {
      event: EmailNotificationEvent;
      title: string;
      message: string;
      href?: string;
    },
  ) {
    const existing = await this.prisma.notification.findUnique({
      where: { id: key },
    });

    await this.prisma.notification.upsert({
      where: { id: key },
      create: {
        id: key,
        userId: data.userId,
        type: data.type,
        priority: data.priority,
        title: data.title,
        message: data.message,
        href: data.href,
        channel: 'in_app',
        payload: { key },
      },
      update: {
        title: data.title,
        message: data.message,
        priority: data.priority,
        href: data.href,
      },
    });

    if (!existing && email) {
      void this.emailNotifications.notifyAdmins(
        email.event,
        email.title,
        email.message,
        email.href,
      );
    }
  }

  private toItem(n: {
    id: string;
    type: string;
    priority: NotificationPriority;
    title: string;
    message: string;
    createdAt: Date;
    readAt: Date | null;
    href: string | null;
  }): NotificationItem {
    return {
      id: n.id,
      type: n.type,
      priority: n.priority.toLowerCase(),
      title: n.title,
      message: n.message,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
      href: n.href ?? undefined,
    };
  }
}
