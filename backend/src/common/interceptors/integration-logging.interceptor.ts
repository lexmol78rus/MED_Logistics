import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';

/** Temporary integration debug logging — enable with INTEGRATION_DEBUG=true */
@Injectable()
export class IntegrationLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('IntegrationDebug');
  private readonly enabled = process.env.INTEGRATION_DEBUG === 'true';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query } = req;
    const started = Date.now();

    this.logger.log(
      `→ ${method} ${url} query=${JSON.stringify(query)} body=${JSON.stringify(body ?? {})}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const payload =
            data && typeof data === 'object'
              ? JSON.stringify(data).slice(0, 500)
              : String(data);
          this.logger.log(`← ${method} ${url} ${Date.now() - started}ms ${payload}`);
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`✗ ${method} ${url} ${Date.now() - started}ms ${message}`);
        },
      }),
    );
  }
}
