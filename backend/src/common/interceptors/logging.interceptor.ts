import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const tenantId = headers['x-tenant-id'] || 'unknown';

    const now = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - ${ip} - ${userAgent} - Tenant: ${tenantId}`,
    );

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const contentLength = response.get('content-length');
        const responseTime = Date.now() - now;

        this.logger.log(
          `Outgoing Response: ${method} ${url} ${statusCode} ${contentLength} - ${responseTime}ms - Tenant: ${tenantId}`,
        );
      }),
    );
  }
}
