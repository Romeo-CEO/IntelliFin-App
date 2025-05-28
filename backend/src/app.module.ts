import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';

import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './modules/health/health.module';
import { TenantModule } from './modules/tenants/tenant.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationModule } from './organizations/organization.module';
import { InvitationModule } from './invitations/invitation.module';
import { EmailModule } from './email/email.module';
import { AirtelMoneyModule } from './integrations/airtel-money/airtel-money.module';
import { QueueModule } from './queue/queue.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';
import { CustomersModule } from './customers/customers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { ExpenseModule } from './expenses/expense.module';
import { ReceiptModule } from './receipts/receipt.module';
import { ApprovalModule } from './approval/approval.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AccountingModule } from './accounting/accounting.module';
import { TaxManagementModule } from './tax-management/tax-management.module';
import { InventoryModule } from './inventory/inventory.module';

// Configuration
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { redisConfig } from './config/redis.config';
import { azureConfig } from './config/azure.config';
import { airtelConfig } from './config/airtel.config';
import { zraConfig } from './config/zra.config';
import { emailConfig } from './config/email.config';
import { analyticsConfig } from './analytics/config/analytics.config';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        azureConfig,
        airtelConfig,
        zraConfig,
        emailConfig,
        analyticsConfig,
      ],
      cache: true,
      expandVariables: true,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            name: 'default',
            ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
            limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10),
          },
        ],
      }),
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Caching
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        store: 'redis',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        ttl: 300, // 5 minutes default TTL
        max: 1000, // Maximum number of items in cache
      }),
    }),

    // Queue management
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.QUEUE_REDIS_HOST || 'localhost',
          port: parseInt(process.env.QUEUE_REDIS_PORT || '6379', 10),
          password: process.env.QUEUE_REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),

    // Core modules
    DatabaseModule,
    CommonModule,
    HealthModule,
    TenantModule,
    AuthModule,
    UsersModule,
    OrganizationModule,
    InvitationModule,
    EmailModule,
    AirtelMoneyModule,
    QueueModule,
    TransactionsModule,
    CategoriesModule,
    CustomersModule,
    InvoicesModule,
    PaymentsModule,
    ReportsModule,
    ExpenseModule,
    ReceiptModule,
    ApprovalModule,
    DashboardModule,
    AnalyticsModule,
    AccountingModule,
    TaxManagementModule,
    InventoryModule,

    // Feature modules will be added in subsequent steps
    // IntegrationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor() {
    console.log('🏗️  IntelliFin Application Module initialized');
  }
}
