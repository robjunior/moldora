import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * MVP auth guard.
 * - Public routes allowed via @Public().
 * - If ADMIN_API_TOKEN unset (dev), allows but marks req.authBypassed=true.
 * - If set, requires Authorization: Bearer <token>.
 * Replace with full Auth.js/session/JWT RBAC for production.
 */
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
    const required = process.env.ADMIN_API_TOKEN;
    if (!required) {
      req.authBypassed = true;
      req.user = { role: 'ADMIN', dev: true };
      return true;
    }
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token || token !== required) throw new UnauthorizedException('Invalid or missing token');
    req.user = { role: 'ADMIN', tokenAuth: true };
    return true;
  }
}
