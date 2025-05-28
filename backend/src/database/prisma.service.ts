import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('database.url'),
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
      errorFormat: 'pretty',
    });

    // Database logging will be configured later when Prisma types are properly available
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  public async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('✅ Database disconnected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to disconnect from database', error);
    }
  }

  /**
   * Get a Prisma client for a specific tenant schema
   * @param tenantId - The tenant ID to get the schema for
   * @returns PrismaClient configured for the tenant schema
   */
  public getTenantClient(tenantId: string): PrismaClient {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    return new PrismaClient({
      datasources: {
        db: {
          url: `${this.configService.get<string>('database.url')}?schema=${schemaName}`,
        },
      },
    });
  }

  /**
   * Create a new tenant schema
   * @param tenantId - The tenant ID to create the schema for
   */
  public async createTenantSchema(tenantId: string): Promise<void> {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      await this.$executeRaw`SELECT create_tenant_schema(${tenantId}::uuid)`;
      this.logger.log(`✅ Created tenant schema: ${schemaName}`);
    } catch (error) {
      this.logger.error(`❌ Failed to create tenant schema: ${schemaName}`, error);
      throw error;
    }
  }

  /**
   * Drop a tenant schema
   * @param tenantId - The tenant ID to drop the schema for
   */
  public async dropTenantSchema(tenantId: string): Promise<void> {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      await this.$executeRaw`SELECT drop_tenant_schema(${tenantId}::uuid)`;
      this.logger.log(`✅ Dropped tenant schema: ${schemaName}`);
    } catch (error) {
      this.logger.error(`❌ Failed to drop tenant schema: ${schemaName}`, error);
      throw error;
    }
  }

  /**
   * Check if a tenant schema exists
   * @param tenantId - The tenant ID to check
   * @returns boolean indicating if the schema exists
   */
  public async tenantSchemaExists(tenantId: string): Promise<boolean> {
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      const result = await this.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.schemata
          WHERE schema_name = ${schemaName}
        ) as exists
      `;

      return result[0]?.exists || false;
    } catch (error) {
      this.logger.error(`❌ Failed to check tenant schema existence: ${schemaName}`, error);
      return false;
    }
  }
}
