import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient as PrismaClientBase } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

// Re-export Prisma types for use in other modules
export * from '@prisma/client';

// Type for model delegates with common methods
type PrismaModel = {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
  create: (args: { data: any }) => Promise<any>;
  update: (args: { where: any; data: any }) => Promise<any>;
  delete: (args: { where: any }) => Promise<any>;
  count: (args?: any) => Promise<number>;
  [key: string]: any; // Allow other methods to be accessed
};

@Injectable()
export class PrismaService extends PrismaClientBase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  
  // Model accessors with proper typing - using type assertions to bypass TypeScript limitations
  public get category() {
    return (this as any).category as PrismaModel;
  }
  
  public get user() {
    return (this as any).user as PrismaModel;
  }
  
  public get organization() {
    return (this as any).organization as PrismaModel;
  }
  
  public get tenant() {
    return (this as any).tenant as PrismaModel;
  }
  
  public get userSession() {
    return (this as any).userSession as PrismaModel;
  }
  
  public get transaction() {
    return (this as any).transaction as PrismaModel;
  }

  constructor(private readonly configService: ConfigService) {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });

    this.$on('warn', (e: { message: string }) => {
      this.logger.warn(e.message);
    });

    this.$on('error', (e: { message: string }) => {
      this.logger.error(e.message);
    });

    this.$use(async (params: any, next: any) => {
      const before = Date.now();
      const result = await next(params);
      const duration = Date.now() - before;

      if (duration > 200) {
        this.logger.warn(
          `Slow query (${duration}ms): ${params.model}.${params.action}`,
          {
            model: params.model,
            action: params.action,
            duration,
          }
        );
      }

      return result;
    });
  }

  get db() {
    // Use the base Prisma client directly since we've extended it
    return this;
  }

  async onModuleInit() {
    await this.$connect();
    this.setupLogging();
    this.logger.log('Successfully connected to the database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from the database');
  }

  private setupLogging() {
    if (this.configService.get('NODE_ENV') === 'development') {
      this.$on('query' as any, (e: any) => {
        this.logger.debug(`Query: ${e.query}`, {
          duration: e.duration,
          params: e.params,
        });
      });
    }
  }

  // Helper method to get the underlying Prisma client
  getClient(): PrismaClientBase {
    return this;
  }
  
  // Add $use method to satisfy PrismaClient type
  $use(cb: (params: any, next: (params: any) => Promise<any>) => Promise<any>) {
    return (this as any).$use(cb);
  }

  /**
   * Get a Prisma client for a specific tenant schema
   * @param schema - The schema name to use for the tenant
   * @returns PrismaService configured for the tenant schema
   * @throws {Error} If schema is not provided or invalid
   */
  public getTenantClient(schema: string): PrismaService {
    if (!schema || typeof schema !== 'string') {
      throw new Error('Schema must be a non-empty string');
    }

    const prisma = new PrismaService(this.configService);
    
    // Override the $connect method to use the tenant schema
    const originalConnect = prisma.$connect.bind(prisma);
    prisma.$connect = async () => {
      const dbUrl = this.configService.get<string>('DATABASE_URL');
      if (!dbUrl) {
        throw new Error('DATABASE_URL is not configured');
      }
      const url = new URL(dbUrl);
      url.searchParams.set('schema', schema);
      prisma['$connect'] = originalConnect;
      return prisma.$connect();
    };

    return prisma;
  }

  /**
   * Create a new tenant schema
   * @param tenantId - The tenant ID to create the schema for
   * @throws {Error} If schema creation fails or tenant ID is invalid
   */
  public async createTenantSchema(tenantId: string): Promise<void> {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Tenant ID must be a non-empty string');
    }

    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      await this.$executeRaw`SELECT create_tenant_schema(${tenantId}::uuid)`;
      this.logger.log(`✅ Created tenant schema: ${schemaName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to create tenant schema ${schemaName}: ${errorMessage}`);
      throw new Error(`Failed to create tenant schema: ${errorMessage}`);
    }
  }

  /**
   * Drop a tenant schema
   * @param tenantId - The tenant ID to drop the schema for
   * @throws {Error} If schema deletion fails or tenant ID is invalid
   */
  public async dropTenantSchema(tenantId: string): Promise<void> {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Tenant ID must be a non-empty string');
    }

    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      await this.$executeRaw`SELECT drop_tenant_schema(${tenantId}::uuid)`;
      this.logger.log(`✅ Dropped tenant schema: ${schemaName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to drop tenant schema ${schemaName}: ${errorMessage}`);
      throw new Error(`Failed to drop tenant schema: ${errorMessage}`);
    }
  }

  /**
   * Check if a tenant schema exists
   * @param tenantId - The tenant ID to check
   * @returns boolean indicating if the schema exists
   */
  /**
   * Check if a tenant schema exists
   * @param tenantId - The tenant ID to check
   * @returns {Promise<boolean>} True if the schema exists, false otherwise
   */
  public async tenantSchemaExists(tenantId: string): Promise<boolean> {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Tenant ID must be a non-empty string');
    }

    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

    try {
      type SchemaExistsResult = Array<{ exists: boolean }>;
      const result = await this.$queryRaw<SchemaExistsResult>`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.schemata
          WHERE schema_name = ${schemaName}
        ) as "exists"
      `;

      return result[0]?.exists ?? false;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to check tenant schema existence ${schemaName}: ${errorMessage}`);
      return false;
    }
  }
}
