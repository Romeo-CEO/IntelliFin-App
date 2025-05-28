import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { DatabaseModule } from '../database/database.module';
import { TransactionSyncProcessor } from './processors/transaction-sync.processor';
import { QueueService } from './queue.service';
import { RetryStrategy } from './strategies/retry.strategy';

// Queue names
export const QUEUE_NAMES = {
  TRANSACTION_SYNC: 'transaction-sync',
  BALANCE_UPDATE: 'balance-update',
  ERROR_HANDLING: 'error-handling',
  NOTIFICATION: 'notification',
} as const;

// Job types
export const JOB_TYPES = {
  SYNC_ACCOUNT_TRANSACTIONS: 'sync-account-transactions',
  SYNC_ALL_ACCOUNTS: 'sync-all-accounts',
  UPDATE_ACCOUNT_BALANCE: 'update-account-balance',
  RETRY_FAILED_SYNC: 'retry-failed-sync',
  CLEANUP_OLD_JOBS: 'cleanup-old-jobs',
  SEND_SYNC_NOTIFICATION: 'send-sync-notification',
} as const;

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    
    // Transaction Sync Queue
    BullModule.registerQueueAsync({
      name: QUEUE_NAMES.TRANSACTION_SYNC,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('QUEUE_REDIS_HOST', 'localhost'),
          port: configService.get<number>('QUEUE_REDIS_PORT', 6379),
          password: configService.get<string>('QUEUE_REDIS_PASSWORD'),
          db: configService.get<number>('QUEUE_REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 50, // Keep more completed jobs for transaction sync
          removeOnFail: 20,
          attempts: 5, // More attempts for critical sync operations
          backoff: {
            type: 'exponential',
            delay: 3000, // Start with 3 seconds
          },
          delay: 0,
        },
        settings: {
          stalledInterval: 30 * 1000, // 30 seconds
          maxStalledCount: 1,
        },
      }),
      inject: [ConfigService],
    }),

    // Balance Update Queue
    BullModule.registerQueueAsync({
      name: QUEUE_NAMES.BALANCE_UPDATE,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('QUEUE_REDIS_HOST', 'localhost'),
          port: configService.get<number>('QUEUE_REDIS_PORT', 6379),
          password: configService.get<string>('QUEUE_REDIS_PASSWORD'),
          db: configService.get<number>('QUEUE_REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 10,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Error Handling Queue
    BullModule.registerQueueAsync({
      name: QUEUE_NAMES.ERROR_HANDLING,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('QUEUE_REDIS_HOST', 'localhost'),
          port: configService.get<number>('QUEUE_REDIS_PORT', 6379),
          password: configService.get<string>('QUEUE_REDIS_PASSWORD'),
          db: configService.get<number>('QUEUE_REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 50, // Keep failed error handling jobs for analysis
          attempts: 1, // Don't retry error handling jobs
          delay: 0,
        },
      }),
      inject: [ConfigService],
    }),

    // Notification Queue
    BullModule.registerQueueAsync({
      name: QUEUE_NAMES.NOTIFICATION,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('QUEUE_REDIS_HOST', 'localhost'),
          port: configService.get<number>('QUEUE_REDIS_PORT', 6379),
          password: configService.get<string>('QUEUE_REDIS_PASSWORD'),
          db: configService.get<number>('QUEUE_REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 10,
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    QueueService,
    TransactionSyncProcessor,
    RetryStrategy,
  ],
  exports: [
    QueueService,
    BullModule,
  ],
})
export class QueueModule {}
