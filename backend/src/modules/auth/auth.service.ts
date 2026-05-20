import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Placeholder for issuer signing and refresh rotation.
   * Implement password verification and token persistence here.
   */
  async issueAccessTokenForUser(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
      },
    );
  }

  /** Validates DTO shape only — credential checks are deferred. */
  assertLoginDto(_dto: LoginDto): void {
    void _dto;
  }

  /** Reserved for credential-based login (not implemented). */
  loginNotImplemented(): never {
    throw new HttpException(
      'Authentication is not implemented yet.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
