import { Injectable, NestMiddleware, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { TenantService } from '../tenant.service';

// Extend Express Request interface to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        slug: string;
        schemaName: string;
        status: string;
      };
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly tenantService: TenantService) {}

  public async use(req: Request, _res: Response, next: NextFunction) {
    try {
      // Skip tenant resolution for certain routes
      if (this.shouldSkipTenantResolution(req.path)) {
        return next();
      }

      const tenantId = this.extractTenantId(req);

      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }

      // Get tenant information
      const tenant = await this.tenantService.getTenantById(tenantId);

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      // Check tenant status
      if (tenant.status !== 'ACTIVE') {
        throw new BadRequestException(`Tenant is ${tenant.status.toLowerCase()}`);
      }

      // Attach tenant information to request
      req.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        schemaName: tenant.schemaName,
        status: tenant.status,
      };

      this.logger.debug(`Resolved tenant: ${tenant.slug} (${tenant.id})`);

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Tenant resolution failed: ${errorMessage}`);
      next(error);
    }
  }

  /**
   * Extract tenant ID from request
   * Priority: Header > Query > Subdomain
   */
  private extractTenantId(req: Request): string | null {
    // 1. Check X-Tenant-ID header
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      return headerTenantId;
    }

    // 2. Check query parameter
    const queryTenantId = req.query.tenantId as string;
    if (queryTenantId) {
      return queryTenantId;
    }

    // 3. Extract from subdomain (e.g., acme.intellifin.com)
    const host = req.headers.host;
    if (host) {
      const subdomain = this.extractSubdomain(host);
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        // For subdomain-based tenant resolution, we would need to look up by slug
        // This is a placeholder for future implementation
        return null;
      }
    }

    return null;
  }

  /**
   * Extract subdomain from host
   */
  private extractSubdomain(host: string): string | null {
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
    return null;
  }

  /**
   * Check if tenant resolution should be skipped for certain routes
   */
  private shouldSkipTenantResolution(path: string): boolean {
    const skipPaths = [
      '/api/health',
      '/api/docs',
      '/api/tenants',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
    ];

    return skipPaths.some(skipPath => path.startsWith(skipPath));
  }
}
