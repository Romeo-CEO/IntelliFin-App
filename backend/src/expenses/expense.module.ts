import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { ExpenseRepository } from './expense.repository';
import { DatabaseModule } from '../database/database.module';
import { CategoriesModule } from '../categories/categories.module';
import { ChartOfAccountsService } from '../accounting/chart-of-accounts.service';

@Module({
  imports: [
    DatabaseModule,
    CategoriesModule,
  ],
  controllers: [ExpenseController],
  providers: [
    ExpenseService,
    ExpenseRepository,
    ChartOfAccountsService,
  ],
  exports: [
    ExpenseService,
    ExpenseRepository,
    ChartOfAccountsService,
  ],
})
export class ExpenseModule {}
