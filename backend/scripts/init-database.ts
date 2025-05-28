#!/usr/bin/env ts-node

/**
 * Database Initialization Script for IntelliFin
 * 
 * This script initializes the database with:
 * - Global schema setup
 * - Required extensions and functions
 * - Demo tenant creation
 * - Default data seeding
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MigrationService } from '../src/database/migration.service';
import { TenantService } from '../src/modules/tenants/tenant.service';

const logger = new Logger('DatabaseInit');

async function initializeDatabase() {
  logger.log('🚀 Starting IntelliFin database initialization...');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const prismaService = app.get(PrismaService);
    const migrationService = app.get(MigrationService);
    const tenantService = app.get(TenantService);

    // Step 1: Run initial database setup
    logger.log('📋 Step 1: Running initial database setup...');
    await migrationService.runInitialSetup();

    // Step 2: Generate Prisma client
    logger.log('🔧 Step 2: Generating Prisma client...');
    await prismaService.$executeRaw`SELECT 1`; // Test connection

    // Step 3: Create demo tenant if it doesn't exist
    logger.log('🏢 Step 3: Creating demo tenant...');
    try {
      const existingTenant = await tenantService.getTenantBySlug('demo');
      logger.log('Demo tenant already exists, skipping creation');
    } catch (error) {
      // Tenant doesn't exist, create it
      const demoTenant = await tenantService.createTenant({
        name: 'Demo Company Ltd',
        slug: 'demo',
        businessType: 'Limited Company',
        zraTin: '1234567890',
        email: 'demo@intellifin.com',
        phone: '+260971234567',
        address: '123 Independence Avenue',
        city: 'Lusaka',
        industry: 'Technology',
      });
      
      logger.log(`✅ Created demo tenant: ${demoTenant.name} (${demoTenant.id})`);
    }

    // Step 4: Seed default data
    logger.log('🌱 Step 4: Seeding default data...');
    await seedDefaultData(prismaService);

    // Step 5: Verify setup
    logger.log('✅ Step 5: Verifying database setup...');
    const stats = await migrationService.getDatabaseStats();
    logger.log('Database Statistics:', JSON.stringify(stats, null, 2));

    logger.log('🎉 Database initialization completed successfully!');
    logger.log('');
    logger.log('Next steps:');
    logger.log('1. Start the application: npm run start:dev');
    logger.log('2. Access API docs: http://localhost:3001/api/docs');
    logger.log('3. Use demo credentials to test the system');

  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

async function seedDefaultData(prismaService: PrismaService) {
  // Check if data already exists
  const tenantCount = await prismaService.tenant.count();
  
  if (tenantCount === 0) {
    logger.log('No tenants found, running seed script...');
    
    // Import and run the seed script
    const { execSync } = require('child_process');
    execSync('npm run prisma:seed', { stdio: 'inherit' });
  } else {
    logger.log('Data already exists, skipping seed');
  }
}

// Handle script execution
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script execution failed:', error);
      process.exit(1);
    });
}

export { initializeDatabase };
