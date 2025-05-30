import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Create a new tenant with isolated schema
   */
  public async createTenant(createTenantDto: CreateTenantDto) {
    const {
      name,
      slug,
      businessType,
      zraTin,
      email,
      phone,
      address,
      city,
      industry,
    } = createTenantDto;

    // Generate schema name
    const schemaName = this.generateSchemaName(slug);

    try {
      // Check if tenant with slug or ZRA TIN already exists
      const existingTenant = await this.prismaService.tenant.findFirst({
        where: {
          OR: [{ slug }, { zraTin: zraTin || undefined }],
        },
      });

      if (existingTenant) {
        if (existingTenant.slug === slug) {
          throw new ConflictException('Tenant with this slug already exists');
        }
        if (existingTenant.zraTin === zraTin) {
          throw new ConflictException(
            'Tenant with this ZRA TIN already exists'
          );
        }
      }

      // Create tenant record
      const tenant = await this.prismaService.tenant.create({
        data: {
          name,
          slug,
          schemaName,
          businessType,
          zraTin,
          email,
          phone,
          address,
          city,
          industry,
          status: 'ACTIVE',
          subscriptionPlan: 'TRIAL',
          subscriptionStatus: 'TRIAL',
          subscriptionStartDate: new Date(),
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        },
      });

      // TODO: Create tenant schema (temporarily disabled for testing)
      // await this.prismaService.createTenantSchema(tenant.id);

      // TODO: Initialize tenant schema with default data (temporarily disabled for testing)
      // await this.initializeTenantSchema(tenant.id);

      this.logger.warn(
        `⚠️  Tenant schema creation skipped for testing: ${tenant.id}`
      );

      this.logger.log(`Created tenant: ${tenant.name} (${tenant.id})`);

      return tenant;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create tenant: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  public async getTenantById(tenantId: string) {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Get tenant by slug
   */
  public async getTenantBySlug(slug: string) {
    const tenant = await this.prismaService.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Update tenant information
   */
  public async updateTenant(
    tenantId: string,
    updateTenantDto: UpdateTenantDto
  ) {
    const tenant = await this.getTenantById(tenantId);

    const updatedTenant = await this.prismaService.tenant.update({
      where: { id: tenantId },
      data: updateTenantDto,
    });

    this.logger.log(`Updated tenant: ${tenant.name} (${tenantId})`);

    return updatedTenant;
  }

  /**
   * Suspend tenant (soft delete)
   */
  public async suspendTenant(tenantId: string, reason?: string) {
    const tenant = await this.getTenantById(tenantId);

    const updatedTenant = await this.prismaService.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'SUSPENDED',
        settings: {
          ...((tenant.settings as any) || {}),
          suspensionReason: reason,
          suspendedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.warn(
      `Suspended tenant: ${tenant.name} (${tenantId}). Reason: ${reason}`
    );

    return updatedTenant;
  }

  /**
   * Delete tenant and its schema
   */
  public async deleteTenant(tenantId: string) {
    const tenant = await this.getTenantById(tenantId);

    try {
      // Drop tenant schema
      await this.prismaService.dropTenantSchema(tenantId);

      // Delete tenant record
      await this.prismaService.tenant.delete({
        where: { id: tenantId },
      });

      this.logger.warn(`Deleted tenant: ${tenant.name} (${tenantId})`);

      return { success: true, message: 'Tenant deleted successfully' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete tenant: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Get tenant database client
   */
  public getTenantClient(tenantId: string): PrismaClient {
    return this.prismaService.getTenantClient(tenantId);
  }

  /**
   * Check if tenant schema exists
   */
  public async tenantSchemaExists(tenantId: string): Promise<boolean> {
    return this.prismaService.tenantSchemaExists(tenantId);
  }

  /**
   * Generate schema name from slug
   */
  private generateSchemaName(slug: string): string {
    return `tenant_${slug.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
  }

  /**
   * Initialize tenant schema with default data
   */
  private async initializeTenantSchema(tenantId: string) {
    const tenantClient = this.getTenantClient(tenantId);

    try {
      // Create default categories based on Zambian Chart of Accounts
      await this.createDefaultCategories(tenantClient);

      this.logger.log(`Initialized tenant schema for tenant: ${tenantId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to initialize tenant schema: ${errorMessage}`,
        errorStack
      );
      throw error;
    } finally {
      await tenantClient.$disconnect();
    }
  }

  /**
   * Create default categories for Zambian businesses
   */
  private async createDefaultCategories(tenantClient: PrismaClient) {
    const defaultCategories = [
      // Income categories
      {
        name: 'Sales Revenue',
        type: 'INCOME',
        chartOfAccountsCode: '4000',
        isSystem: true,
      },
      {
        name: 'Service Revenue',
        type: 'INCOME',
        chartOfAccountsCode: '4100',
        isSystem: true,
      },
      {
        name: 'Interest Income',
        type: 'INCOME',
        chartOfAccountsCode: '4200',
        isSystem: true,
      },
      {
        name: 'Other Income',
        type: 'INCOME',
        chartOfAccountsCode: '4900',
        isSystem: true,
      },

      // Expense categories
      {
        name: 'Cost of Goods Sold',
        type: 'EXPENSE',
        chartOfAccountsCode: '5000',
        isSystem: true,
      },
      {
        name: 'Office Supplies',
        type: 'EXPENSE',
        chartOfAccountsCode: '6100',
        isSystem: true,
      },
      {
        name: 'Rent Expense',
        type: 'EXPENSE',
        chartOfAccountsCode: '6200',
        isSystem: true,
      },
      {
        name: 'Utilities',
        type: 'EXPENSE',
        chartOfAccountsCode: '6300',
        isSystem: true,
      },
      {
        name: 'Telephone & Internet',
        type: 'EXPENSE',
        chartOfAccountsCode: '6400',
        isSystem: true,
      },
      {
        name: 'Vehicle Expenses',
        type: 'EXPENSE',
        chartOfAccountsCode: '6500',
        isSystem: true,
      },
      {
        name: 'Travel & Entertainment',
        type: 'EXPENSE',
        chartOfAccountsCode: '6600',
        isSystem: true,
      },
      {
        name: 'Professional Fees',
        type: 'EXPENSE',
        chartOfAccountsCode: '6700',
        isSystem: true,
      },
      {
        name: 'Insurance',
        type: 'EXPENSE',
        chartOfAccountsCode: '6800',
        isSystem: true,
      },
      {
        name: 'Bank Charges',
        type: 'EXPENSE',
        chartOfAccountsCode: '6900',
        isSystem: true,
      },

      // Asset categories
      {
        name: 'Cash and Bank',
        type: 'ASSET',
        chartOfAccountsCode: '1000',
        isSystem: true,
      },
      {
        name: 'Accounts Receivable',
        type: 'ASSET',
        chartOfAccountsCode: '1200',
        isSystem: true,
      },
      {
        name: 'Inventory',
        type: 'ASSET',
        chartOfAccountsCode: '1300',
        isSystem: true,
      },
      {
        name: 'Equipment',
        type: 'ASSET',
        chartOfAccountsCode: '1500',
        isSystem: true,
      },

      // Liability categories
      {
        name: 'Accounts Payable',
        type: 'LIABILITY',
        chartOfAccountsCode: '2000',
        isSystem: true,
      },
      {
        name: 'VAT Payable',
        type: 'LIABILITY',
        chartOfAccountsCode: '2100',
        isSystem: true,
      },
      {
        name: 'PAYE Payable',
        type: 'LIABILITY',
        chartOfAccountsCode: '2200',
        isSystem: true,
      },

      // Equity categories
      {
        name: "Owner's Equity",
        type: 'EQUITY',
        chartOfAccountsCode: '3000',
        isSystem: true,
      },
      {
        name: 'Retained Earnings',
        type: 'EQUITY',
        chartOfAccountsCode: '3100',
        isSystem: true,
      },
    ];

    for (const category of defaultCategories) {
      await tenantClient.category.create({
        data: {
          name: category.name,
          type: category.type as any,
          chartOfAccountsCode: category.chartOfAccountsCode,
          isSystem: category.isSystem,
          organizationId: '00000000-0000-0000-0000-000000000000', // Placeholder, will be updated when organization is created
        },
      });
    }
  }
}
