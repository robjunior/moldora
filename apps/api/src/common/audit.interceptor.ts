import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const mutating = ['POST','PATCH','PUT','DELETE'].includes(method);
    return next.handle().pipe(tap(async (data) => {
      if (!mutating) return;
      try {
        await this.prisma.auditLog.create({ data: { action: `${method} ${url}`, entityType: 'http', entityId: req.params?.id || data?.id || null, metadata: { bodyKeys: Object.keys(req.body || {}), status: 'ok' } as any } });
      } catch {}
    }));
  }
}
