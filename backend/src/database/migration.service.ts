import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaService } from './prisma.service';

/**
 * Service for handling database migrations and schema operations
 * Provides methods for database initialization and tenant schema management
 */

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Run initial database setup
   * @throws {Error} If setup fails
   */
  public async runInitialSetup(): Promise<void> {
    try {
      this.logger.log('Running initial database setup...');

      // Check if database is already initialized
      const isInitialized = await this.isDatabaseInitialized();

      if (isInitialized) {
        this.logger.log('Database already initialized');
        return;
      }

      // Run initialization script
      await this.runInitializationScript();

      this.logger.log('✅ Initial database setup completed');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Initial database setup failed: ${errorMessage}`);
      throw new Error(`Database setup failed: ${errorMessage}`);
    }
  }

  /**
   * Create tenant schema from template
   */
  /**
   * Create a tenant schema from a template
   * @param tenantId - The tenant ID to create the schema for
   * @throws {Error} If schema creation fails
   */
  public async createTenantSchemaFromTemplate(tenantId: string): Promise<void> {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Tenant ID must be a non-empty string');
    }

    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    try {
      this.logger.log(`Creating tenant schema from template for tenant: ${tenantId}`);

      // Read tenant schema template
      const templatePath = path.join(
        process.cwd(),
        'prisma',
        'tenant-schema-template.sql'
      );

      // Check if template file exists
      try {
        await fs.access(templatePath);
      } catch (error) {
        throw new Error(`Template file not found at ${templatePath}`);
      }

      const templateSql = await fs.readFile(templatePath, 'utf8');

      // Create schema
      await this.prismaService.$executeRawUnsafe(
        `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`
      );

      // Set search path and execute template
      await this.prismaService.$executeRawUnsafe(
        `SET search_path TO "${schemaName}"`
      );

      try {
        // Split and execute SQL statements
        const statements = this.splitSqlStatements(templateSql);
        
        for (const [index, statement] of statements.entries()) {
          const trimmedStatement = statement.trim();
          if (trimmedStatement) {
            try {
              await this.prismaService.$executeRawUnsafe(trimmedStatement);
            } catch (statementError) {
              const errorMessage = statementError instanceof Error ? statementError.message : 'Unknown error';
              throw new Error(`Error executing statement #${index + 1}: ${errorMessage}\n${trimmedStatement}`);
            }
          }
        }
      } finally {
        // Always reset search path
        await this.prismaService.$executeRawUnsafe('SET search_path TO public');
      }

      this.logger.log(`✅ Tenant schema created: ${schemaName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to create tenant schema ${schemaName}: ${errorMessage}`);
      throw new Error(`Failed to create tenant schema: ${errorMessage}`);
    }
  }

  /**
   * Drop tenant schema
   */
  /**
   * Drop a tenant schema
   * @param tenantId - The tenant ID to drop the schema for
   * @param force - If true, will not throw error if schema doesn't exist
   * @throws {Error} If schema deletion fails
   */
  public async dropTenantSchema(tenantId: string, force = false): Promise<void> {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Tenant ID must be a non-empty string');
    }

    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    try {
      await this.prismaService.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`
      );
      this.logger.log(`✅ Dropped tenant schema: ${schemaName}`);
    } catch (error: unknown) {
      if (force) {
        this.logger.warn(`⚠️ Force continuing after error dropping schema ${schemaName}: ${error}`);
        return;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to drop tenant schema ${schemaName}: ${errorMessage}`);
      throw new Error(`Failed to drop tenant schema: ${errorMessage}`);
    }
  }

  /**
   * Backup tenant schema
   */
  public async backupTenantSchema(tenantId: string): Promise<string> {
    try {
      const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
      const backupName = `${schemaName}_backup_${Date.now()}`;

      // Create backup schema
      await this.prismaService.$executeRawUnsafe(
        `CREATE SCHEMA "${backupName}"`
      );

      // Copy all tables and data
      const tables = await this.getTenantSchemaTables(schemaName);

      for (const table of tables) {
        await this.prismaService.$executeRawUnsafe(
          `CREATE TABLE "${backupName}"."${table}" AS SELECT * FROM "${schemaName}"."${table}"`
        );
      }

      this.logger.log(`✅ Tenant schema backed up: ${backupName}`);
      return backupName;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `❌ Failed to backup tenant schema: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  /**
   * Restore tenant schema from backup
   */
  public async restoreTenantSchema(
    tenantId: string,
    backupName: string
  ): Promise<void> {
    try {
      const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

      // Drop existing schema
      await this.dropTenantSchema(tenantId);

      // Create new schema
      await this.prismaService.$executeRawUnsafe(
        `CREATE SCHEMA "${schemaName}"`
      );

      // Copy all tables and data from backup
      const tables = await this.getTenantSchemaTables(backupName);

      for (const table of tables) {
        await this.prismaService.$executeRawUnsafe(
          `CREATE TABLE "${schemaName}"."${table}" AS SELECT * FROM "${backupName}"."${table}"`
        );
      }

      this.logger.log(`✅ Tenant schema restored from backup: ${backupName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `❌ Failed to restore tenant schema: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  /**
   * Get list of tables in tenant schema
   */
  private async getTenantSchemaTables(schemaName: string): Promise<string[]> {
    const result = await this.prismaService.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${schemaName}
      AND table_type = 'BASE TABLE'
    `;

    return result.map(row => row.table_name);
  }

  /**
   * Check if database is initialized
   */
  /**
   * Check if the database is already initialized
   * @returns {Promise<boolean>} True if database is initialized
   */
  private async isDatabaseInitialized(): Promise<boolean> {
    try {
      // Check for existence of a table that should exist after initialization
      const result = await this.prismaService.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migrations'
        ) as "exists"
      `;
      
      return result[0]?.exists ?? false;
    } catch (error) {
      this.logger.warn('Failed to check if database is initialized', error);
      return false;
    }
  }

  /**
   * Run database initialization script
   */
  /**
   * Run database initialization script
   * @throws {Error} If initialization fails
   */
  private async runInitializationScript(): Promise<void> {
    const scriptPath = path.join(process.cwd(), 'prisma', 'init.sql');
    
    try {
      // Check if initialization script exists
      await fs.access(scriptPath);
      
      const sql = await fs.readFile(scriptPath, 'utf8');
      const statements = this.splitSqlStatements(sql);
      
      // Execute each statement in a transaction
      await this.prismaService.$transaction(async (prisma) => {
        for (const [index, statement] of statements.entries()) {
          if (statement.trim()) {
            try {
              await prisma.$executeRawUnsafe(statement);
            } catch (error) {
              throw new Error(`Error executing initialization statement #${index + 1}: ${error}`);
            }
          }
        }
      });
      
      this.logger.log('✅ Database initialization script executed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Database initialization failed: ${errorMessage}`);
      throw new Error(`Database initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Split SQL file into individual statements
   */
  /**
   * Split SQL script into individual statements
   * @param sql - SQL script to split
   * @returns Array of SQL statements
   */
  private splitSqlStatements(sql: string): string[] {
    if (typeof sql !== 'string') {
      throw new Error('SQL input must be a string');
    }

    // Split SQL statements by semicolon, handle multi-line statements
    return sql
      .split(';')
      .map(statement => {
        // Remove comments and trim whitespace
        const cleanStatement = statement
          .replace(/--.*$/gm, '') // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
          .trim();
        
        return cleanStatement;
      })
      .filter(statement => statement.length > 0);
  }

  /**
   * Get database statistics
   */
  public async getDatabaseStats(): Promise<any> {
    try {
      const tenantCount = await this.prismaService.tenant.count();
      const userCount = await this.prismaService.user.count();
      const activeSessionCount = await this.prismaService.userSession.count({
        where: { isActive: true },
      });

      const schemaStats = await this.prismaService.$queryRaw`
        SELECT
          schemaname,
          COUNT(*) as table_count
        FROM pg_tables
        WHERE schemaname LIKE 'tenant_%'
        GROUP BY schemaname
      `;

      return {
        tenants: tenantCount,
        users: userCount,
        activeSessions: activeSessionCount,
        tenantSchemas: schemaStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get database stats:', error);
      throw error;
    }
  }
}
