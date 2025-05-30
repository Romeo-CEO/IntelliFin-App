import { Injectable, Logger } from '@nestjs/common';

import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from './prisma.service';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Run initial database setup
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
    } catch (error) {
      this.logger.error('❌ Initial database setup failed:', error);
      throw error;
    }
  }

  /**
   * Create tenant schema from template
   */
  public async createTenantSchemaFromTemplate(tenantId: string): Promise<void> {
    try {
      this.logger.log(
        `Creating tenant schema from template for tenant: ${tenantId}`
      );

      const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

      // Read tenant schema template
      const templatePath = path.join(
        process.cwd(),
        'prisma',
        'tenant-schema-template.sql'
      );
      const templateSql = fs.readFileSync(templatePath, 'utf8');

      // Create schema
      await this.prismaService.$executeRawUnsafe(
        `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`
      );

      // Set search path and execute template
      await this.prismaService.$executeRawUnsafe(
        `SET search_path TO "${schemaName}"`
      );

      // Split and execute SQL statements
      const statements = this.splitSqlStatements(templateSql);

      for (const statement of statements) {
        if (statement.trim()) {
          await this.prismaService.$executeRawUnsafe(statement);
        }
      }

      // Reset search path
      await this.prismaService.$executeRawUnsafe('SET search_path TO public');

      this.logger.log(`✅ Tenant schema created: ${schemaName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `❌ Failed to create tenant schema: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  /**
   * Drop tenant schema
   */
  public async dropTenantSchema(tenantId: string): Promise<void> {
    try {
      const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;

      await this.prismaService.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`
      );

      this.logger.log(`✅ Tenant schema dropped: ${schemaName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `❌ Failed to drop tenant schema: ${errorMessage}`,
        errorStack
      );
      throw error;
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
  private async isDatabaseInitialized(): Promise<boolean> {
    try {
      // Check if the main tables exist
      const result = await this.prismaService.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('tenants', 'users', 'user_sessions')
      `;

      return result[0]?.count === 3;
    } catch (error) {
      return false;
    }
  }

  /**
   * Run database initialization script
   */
  private async runInitializationScript(): Promise<void> {
    const initScriptPath = path.join(
      process.cwd(),
      'database',
      'init',
      '01-init.sql'
    );

    if (fs.existsSync(initScriptPath)) {
      const initSql = fs.readFileSync(initScriptPath, 'utf8');
      const statements = this.splitSqlStatements(initSql);

      for (const statement of statements) {
        if (statement.trim()) {
          await this.prismaService.$executeRawUnsafe(statement);
        }
      }
    }
  }

  /**
   * Split SQL file into individual statements
   */
  private splitSqlStatements(sql: string): string[] {
    // Remove comments and split by semicolon
    const cleanSql = sql
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

    return cleanSql
      .split(';')
      .map(statement => statement.trim())
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
