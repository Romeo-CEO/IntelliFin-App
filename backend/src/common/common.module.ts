import { Module, Global } from '@nestjs/common';

import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Global()
@Module({
  providers: [
    HttpExceptionFilter,
    TransformInterceptor,
    LoggingInterceptor,
  ],
  exports: [
    HttpExceptionFilter,
    TransformInterceptor,
    LoggingInterceptor,
  ],
})
export class CommonModule {}
