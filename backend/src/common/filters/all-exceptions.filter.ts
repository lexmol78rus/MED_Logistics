import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string | string[]) ?? message;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = this.mapPrismaStatus(exception);
      message = this.mapPrismaMessage(exception);
      code = exception.code;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const trace = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(trace);
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message: Array.isArray(message) ? message.join('; ') : message,
      error: HttpStatus[status] ?? 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    if (code) {
      body.code = code;
    }

    response.status(status).json(body);
  }

  private mapPrismaStatus(err: Prisma.PrismaClientKnownRequestError): number {
    switch (err.code) {
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2025':
        return HttpStatus.NOT_FOUND;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }

  private mapPrismaMessage(err: Prisma.PrismaClientKnownRequestError): string {
    switch (err.code) {
      case 'P2002':
        return 'Unique constraint violation';
      case 'P2025':
        return 'Record not found';
      default:
        return 'Database request error';
    }
  }
}
