import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';

// Services
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { AccountService } from './services/account.service';
import { JournalEntryService } from './services/journal-entry.service';
import { GeneralLedgerService } from './services/general-ledger.service';

// Repositories
import { AccountRepository } from './repositories/account.repository';
import { JournalEntryRepository } from './repositories/journal-entry.repository';
import { GeneralLedgerRepository } from './repositories/general-ledger.repository';

// Controllers
import { AccountController } from './controllers/account.controller';
import { JournalEntryController } from './controllers/journal-entry.controller';
import { GeneralLedgerController } from './controllers/general-ledger.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AccountController,
    JournalEntryController,
    GeneralLedgerController,
  ],
  providers: [
    // Core services
    ChartOfAccountsService,
    AccountService,
    JournalEntryService,
    GeneralLedgerService,

    // Repositories
    AccountRepository,
    JournalEntryRepository,
    GeneralLedgerRepository,
  ],
  exports: [
    // Export services for use in other modules
    ChartOfAccountsService,
    AccountService,
    JournalEntryService,
    GeneralLedgerService,

    // Export repositories for direct access if needed
    AccountRepository,
    JournalEntryRepository,
    GeneralLedgerRepository,
  ],
})
export class AccountingModule {}
