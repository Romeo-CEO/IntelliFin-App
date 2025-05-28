import { Injectable, Scope, Inject } from '@nestjs/common';
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantDatabaseProvider {
  private tenantClient: PrismaClient | null = null;

  constructor(
    private readonly prismaService: PrismaService,
    @Inject('REQUEST') private readonly request: Request,
  ) {}

  /**
   * Get the tenant-specific database client
   */
  public getTenantClient(): PrismaClient {
    if (!this.tenantClient) {
      const tenantId = this.request.tenant?.id;

      if (!tenantId) {
        throw new Error('Tenant ID not found in request context');
      }

      this.tenantClient = this.prismaService.getTenantClient(tenantId);
    }

    return this.tenantClient;
  }

  /**
   * Get the global database client (for cross-tenant operations)
   */
  public getGlobalClient(): PrismaClient {
    return this.prismaService;
  }

  /**
   * Get current tenant information from request
   */
  public getCurrentTenant() {
    return this.request.tenant;
  }

  /**
   * Execute a query in the tenant context
   */
  public async executeInTenantContext<T>(
    operation: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const client = this.getTenantClient();
    return operation(client);
  }

  /**
   * Execute a transaction in the tenant context
   */
  public async executeTransaction<T>(
    operations: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const client = this.getTenantClient();
    return client.$transaction(async (tx) => {
      return operations(tx as PrismaClient);
    });
  }

  /**
   * Cleanup method to disconnect tenant client
   */
  public async cleanup(): Promise<void> {
    if (this.tenantClient) {
      await this.tenantClient.$disconnect();
      this.tenantClient = null;
    }
  }
}
