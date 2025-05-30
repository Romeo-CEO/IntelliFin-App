import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { CategoryRepository } from './category.repository';
import { CategorizationRuleRepository } from './categorization-rule.repository';
import { CategoryService } from './category.service';
import { TransactionCategorizationService } from './transaction-categorization.service';
import { CategoryController } from './category.controller';
import { TransactionCategorizationController } from './transaction-categorization.controller';

@Module({
  imports: [
    DatabaseModule,
    // Note: We import TransactionsModule but need to be careful about circular dependencies
    // The TransactionCategorizationService uses PrismaService directly to avoid circular imports
  ],
  controllers: [CategoryController, TransactionCategorizationController],
  providers: [
    CategoryRepository,
    CategorizationRuleRepository,
    CategoryService,
    TransactionCategorizationService,
  ],
  exports: [
    CategoryRepository,
    CategorizationRuleRepository,
    CategoryService,
    TransactionCategorizationService,
  ],
})
export class CategoriesModule {}
