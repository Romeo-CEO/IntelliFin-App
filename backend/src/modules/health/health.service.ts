import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService
  ) {}

  public async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
    ]);

    const results = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get<string>('NODE_ENV'),
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        database: this.getCheckResult(checks[0]),
        redis: this.getCheckResult(checks[1]),
        memory: this.getCheckResult(checks[2]),
      },
    };

    // Determine overall status
    const hasFailures = Object.values(results.checks).some(
      check => check.status === 'error'
    );

    if (hasFailures) {
      results.status = 'error';
    }

    return results;
  }

  public async readiness() {
    try {
      await this.checkDatabase();
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  private async checkDatabase(): Promise<{
    status: string;
    responseTime: number;
  }> {
    const start = Date.now();
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Database check failed: ${errorMessage}`);
    }
  }

  private async checkRedis(): Promise<{
    status: string;
    responseTime: number;
  }> {
    const start = Date.now();
    try {
      // TODO: Implement Redis health check when Redis service is added
      return {
        status: 'ok',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Redis check failed: ${errorMessage}`);
    }
  }

  private checkMemory(): { status: string; usage: NodeJS.MemoryUsage } {
    const memoryUsage = process.memoryUsage();
    const maxMemory = 512 * 1024 * 1024; // 512MB threshold

    return {
      status: memoryUsage.heapUsed > maxMemory ? 'warning' : 'ok',
      usage: memoryUsage,
    };
  }

  private getCheckResult(result: PromiseSettledResult<any>) {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'error',
        error: result.reason.message,
      };
    }
  }
}
