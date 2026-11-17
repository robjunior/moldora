import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class SimpleAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) throw new UnauthorizedException('Invalid or missing token');

    const tokenMapValue = process.env.API_AUTH_TOKENS_JSON;
    if (tokenMapValue) {
      let tokenMap: Record<string, string>;
      try {
        tokenMap = JSON.parse(tokenMapValue) as Record<string, string>;
      } catch {
        throw new UnauthorizedException('API authentication is misconfigured');
      }
      const role = tokenMap[token];
      if (role) {
        req.user = { role: role.toUpperCase(), tokenAuth: true };
        return true;
      }
    }

    const required = process.env.ADMIN_API_TOKEN;
    if (!required || token !== required) throw new UnauthorizedException('Invalid or missing token');
    req.user = { role: 'ADMIN', tokenAuth: true };
    return true;
  }
}
