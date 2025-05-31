import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CategoryRepository } from './category.repository';
import { CategorizationRuleRepository } from './categorization-rule.repository';
import { TransactionCategorizationService } from './transaction-categorization.service';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    DatabaseModule,
    TransactionsModule,
    // RulesEngineModule will be added back when available
  ],
  controllers: [CategoryController],
  providers: [
    CategoryService,
    CategoryRepository,
    CategorizationRuleRepository,
    TransactionCategorizationService,
  ],
  exports: [
    CategoryService,
    CategoryRepository,
    CategorizationRuleRepository,
    TransactionCategorizationService,
  ],
})
export class CategoryModule {}
