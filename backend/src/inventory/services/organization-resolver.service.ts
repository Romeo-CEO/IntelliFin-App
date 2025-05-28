import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantDatabaseProvider } from '../../modules/tenants/providers/tenant-database.provider';

/**
 * Organization Resolver Service
 * Resolves organization ID from tenant context for inventory operations
 * Handles the tenant -> organization mapping for IntelliFin multi-tenancy
 */
@Injectable()
export class OrganizationResolverService {
  private readonly logger = new Logger(OrganizationResolverService.name);

  constructor(
    private readonly tenantDb: TenantDatabaseProvider,
  ) {}

  /**
   * Get the organization ID for the current tenant
   * In IntelliFin, each tenant typically has one organization
   */
  async getOrganizationId(): Promise<string> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        // Get the first (and typically only) organization for this tenant
        const organization = await prisma.organization.findFirst({
          select: {
            id: true,
          },
        });

        if (!organization) {
          throw new NotFoundException('No organization found for this tenant');
        }

        return organization.id;
      });
    } catch (error) {
      this.logger.error(`Failed to resolve organization ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get organization details for the current tenant
   */
  async getOrganization() {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        const organization = await prisma.organization.findFirst();

        if (!organization) {
          throw new NotFoundException('No organization found for this tenant');
        }

        return organization;
      });
    } catch (error) {
      this.logger.error(`Failed to get organization: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Validate that an organization ID belongs to the current tenant
   */
  async validateOrganizationAccess(organizationId: string): Promise<boolean> {
    try {
      return await this.tenantDb.executeInTenantContext(async (prisma) => {
        const organization = await prisma.organization.findFirst({
          where: {
            id: organizationId,
          },
          select: {
            id: true,
          },
        });

        return !!organization;
      });
    } catch (error) {
      this.logger.error(`Failed to validate organization access: ${error.message}`, error);
      return false;
    }
  }
}
