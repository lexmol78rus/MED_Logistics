import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { notDeletedUserWhere } from '../../common/utils/not-deleted-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { MailConfigService } from '../mail/mail-config.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import type { LoginResponseDto } from './dto/login-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const FORGOT_PASSWORD_MESSAGE = 'Письмо со ссылкой отправлено';
const RESET_LINK_INVALID_MESSAGE =
  'Ссылка восстановления недействительна';
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly mail: MailService,
    private readonly mailConfig: MailConfigService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmailForAuth(email);

    if (!user) {
      await this.audit.write({
        action: 'auth.login_failed',
        entityType: 'auth',
        metadata: { email, reason: 'unknown_user' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.audit.write({
        actorId: user.id,
        action: 'auth.login_failed',
        entityType: 'auth',
        entityId: user.id,
        metadata: { email, reason: 'disabled' },
      });
      throw new UnauthorizedException('Account is disabled');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.audit.write({
        actorId: user.id,
        action: 'auth.login_failed',
        entityType: 'auth',
        entityId: user.id,
        metadata: { email, reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessTokenForUser(user.id, user.email),
      this.issueAndPersistRefreshToken(user.id),
    ]);

    await Promise.all([
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.audit.write({
        actorId: user.id,
        action: 'auth.login',
        entityType: 'auth',
        entityId: user.id,
        metadata: { email: user.email },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refresh(rawRefreshToken: string): Promise<LoginResponseDto> {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    if (!stored.user.isActive || stored.user.deletedAt) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: stored.userId },
      });
      throw new UnauthorizedException('Account is disabled');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessTokenForUser(stored.user.id, stored.user.email),
      this.issueAndPersistRefreshToken(stored.user.id),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    this.logger.log(`[auth] password reset requested for ${email}`);

    const user = await this.prisma.user.findFirst({
      where: { email, ...notDeletedUserWhere, isActive: true },
      select: { id: true, email: true },
    });

    if (user) {
      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        }),
      ]);

      const flags = await this.mailConfig.getNotificationFlags();
      if (flags.passwordReset) {
        const appUrl = this.config.getOrThrow<string>('appUrl');
        const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
        const sent = await this.mail.sendPasswordResetEmail(user.email, resetUrl);
        if (sent) {
          this.logger.log(`[auth] password reset email sent for ${email}`);
        } else {
          this.logger.warn(
            `[auth] password reset email not delivered for ${email}`,
          );
        }
      } else {
        this.logger.warn(
          `[auth] password reset email skipped — disabled in mail notifications`,
        );
      }
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean }> {
    const tokenHash = this.hashToken(dto.token.trim());
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      record.user.deletedAt ||
      !record.user.isActive
    ) {
      throw new BadRequestException(RESET_LINK_INVALID_MESSAGE);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
      this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: record.userId,
          id: { not: record.id },
        },
      }),
    ]);

    await this.audit.write({
      actorId: record.userId,
      action: 'PASSWORD_RESET',
      entityType: 'user',
      entityId: record.userId,
      metadata: { email: record.user.email, source: 'self_service' },
    });

    return { success: true };
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.audit.write({
      actorId: userId,
      action: 'auth.logout',
      entityType: 'auth',
      entityId: userId,
    });
    return { success: true };
  }

  async issueAccessTokenForUser(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
      },
    );
  }

  private async issueAndPersistRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashRefreshToken(rawToken);
    const expiresAt = this.refreshTokenExpiresAt();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  hashRefreshToken(token: string): string {
    return this.hashToken(token);
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshTokenExpiresAt(): Date {
    const raw = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';
    const ms = this.parseDurationToMs(raw);
    return new Date(Date.now() + ms);
  }

  private parseDurationToMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    const amount = Number.parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return amount * (multipliers[unit] ?? multipliers.d);
  }
}
