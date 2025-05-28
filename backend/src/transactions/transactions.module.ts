import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseModule } from '../database/database.module';
import { QueueModule } from '../queue/queue.module';
import { AirtelMoneyModule } from '../integrations/airtel-money/airtel-money.module';

import { TransactionRepository } from './transaction.repository';
import { TransactionSyncService } from './transaction-sync.service';
import { TransactionSyncController } from './transaction-sync.controller';
import { TransactionSchedulerService } from './transaction-scheduler.service';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    AirtelMoneyModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    TransactionSyncController,
  ],
  providers: [
    TransactionRepository,
    TransactionSyncService,
    TransactionSchedulerService,
  ],
  exports: [
    TransactionRepository,
    TransactionSyncService,
  ],
})
export class TransactionsModule {}
