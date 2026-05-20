import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtUser } from '../interfaces/jwt-user.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    return data ? user[data] : user;
  },
);
