import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { GeneralLedgerRepository, GeneralLedgerQueryDto, GeneralLedgerEntryWithAccount, AccountBalance, TrialBalance } from '../repositories/general-ledger.repository';
import { AccountRepository } from '../repositories/account.repository';
import { AccountType } from '@prisma/client';

export interface GeneralLedgerReportDto {
  organizationId: string;
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeInactive?: boolean;
}

export interface BalanceSheetDto {
  assets: {
    currentAssets: AccountBalance[];
    nonCurrentAssets: AccountBalance[];
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: AccountBalance[];
    nonCurrentLiabilities: AccountBalance[];
    totalLiabilities: number;
  };
  equity: {
    equityAccounts: AccountBalance[];
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  asOfDate: Date;
}

export interface IncomeStatementDto {
  revenue: {
    operatingRevenue: AccountBalance[];
    nonOperatingRevenue: AccountBalance[];
    totalRevenue: number;
  };
  expenses: {
    costOfGoodsSold: AccountBalance[];
    operatingExpenses: AccountBalance[];
    nonOperatingExpenses: AccountBalance[];
    totalExpenses: number;
  };
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  periodFrom: Date;
  periodTo: Date;
}

@Injectable()
export class GeneralLedgerService {
  private readonly logger = new Logger(GeneralLedgerService.name);

  constructor(
    private readonly generalLedgerRepository: GeneralLedgerRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  /**
   * Get general ledger entries with filtering and pagination
   */
  async getGeneralLedgerEntries(organizationId: string, query: GeneralLedgerQueryDto) {
    try {
      return await this.generalLedgerRepository.findMany(organizationId, query);
    } catch (error) {
      this.logger.error(`Failed to get general ledger entries: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get general ledger entries');
    }
  }

  /**
   * Get account ledger (all entries for a specific account)
   */
  async getAccountLedger(
    organizationId: string,
    accountId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<GeneralLedgerEntryWithAccount[]> {
    try {
      // Verify account exists
      const account = await this.accountRepository.findById(organizationId, accountId);
      if (!account) {
        throw new NotFoundException('Account not found');
      }

      return await this.generalLedgerRepository.getAccountLedger(organizationId, accountId, dateFrom, dateTo);
    } catch (error) {
      this.logger.error(`Failed to get account ledger: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get account ledger');
    }
  }

  /**
   * Get account balance as of a specific date
   */
  async getAccountBalance(organizationId: string, accountId: string, asOfDate?: Date): Promise<number> {
    try {
      // Verify account exists
      const account = await this.accountRepository.findById(organizationId, accountId);
      if (!account) {
        throw new NotFoundException('Account not found');
      }

      return await this.generalLedgerRepository.getAccountBalance(organizationId, accountId, asOfDate);
    } catch (error) {
      this.logger.error(`Failed to get account balance: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get account balance');
    }
  }

  /**
   * Generate trial balance
   */
  async generateTrialBalance(organizationId: string, asOfDate: Date): Promise<TrialBalance> {
    try {
      this.logger.log(`Generating trial balance for organization: ${organizationId} as of ${asOfDate.toISOString()}`);

      const trialBalance = await this.generalLedgerRepository.generateTrialBalance(organizationId, asOfDate);

      this.logger.log(`Generated trial balance with ${trialBalance.accounts.length} accounts. Balanced: ${trialBalance.isBalanced}`);
      return trialBalance;
    } catch (error) {
      this.logger.error(`Failed to generate trial balance: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate trial balance');
    }
  }

  /**
   * Generate balance sheet
   */
  async generateBalanceSheet(organizationId: string, asOfDate: Date): Promise<BalanceSheetDto> {
    try {
      this.logger.log(`Generating balance sheet for organization: ${organizationId} as of ${asOfDate.toISOString()}`);

      // Get account balances by type
      const [assetBalances, liabilityBalances, equityBalances] = await Promise.all([
        this.generalLedgerRepository.getAccountBalancesByType(organizationId, 'ASSET', asOfDate),
        this.generalLedgerRepository.getAccountBalancesByType(organizationId, 'LIABILITY', asOfDate),
        this.generalLedgerRepository.getAccountBalancesByType(organizationId, 'EQUITY', asOfDate),
      ]);

      // Categorize assets
      const currentAssets = assetBalances.filter(account => 
        account.accountCode.startsWith('1') && parseInt(account.accountCode) < 1500
      );
      const nonCurrentAssets = assetBalances.filter(account => 
        account.accountCode.startsWith('1') && parseInt(account.accountCode) >= 1500
      );

      // Categorize liabilities
      const currentLiabilities = liabilityBalances.filter(account => 
        account.accountCode.startsWith('2') && parseInt(account.accountCode) < 2500
      );
      const nonCurrentLiabilities = liabilityBalances.filter(account => 
        account.accountCode.startsWith('2') && parseInt(account.accountCode) >= 2500
      );

      // Calculate totals
      const totalAssets = assetBalances.reduce((sum, account) => sum + account.balance, 0);
      const totalLiabilities = liabilityBalances.reduce((sum, account) => sum + account.balance, 0);
      const totalEquity = equityBalances.reduce((sum, account) => sum + account.balance, 0);
      const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

      const balanceSheet: BalanceSheetDto = {
        assets: {
          currentAssets,
          nonCurrentAssets,
          totalAssets,
        },
        liabilities: {
          currentLiabilities,
          nonCurrentLiabilities,
          totalLiabilities,
        },
        equity: {
          equityAccounts: equityBalances,
          totalEquity,
        },
        totalLiabilitiesAndEquity,
        isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
        asOfDate,
      };

      this.logger.log(`Generated balance sheet. Assets: ${totalAssets}, Liabilities + Equity: ${totalLiabilitiesAndEquity}, Balanced: ${balanceSheet.isBalanced}`);
      return balanceSheet;
    } catch (error) {
      this.logger.error(`Failed to generate balance sheet: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate balance sheet');
    }
  }

  /**
   * Generate income statement
   */
  async generateIncomeStatement(organizationId: string, periodFrom: Date, periodTo: Date): Promise<IncomeStatementDto> {
    try {
      this.logger.log(`Generating income statement for organization: ${organizationId} from ${periodFrom.toISOString()} to ${periodTo.toISOString()}`);

      // Get revenue and expense balances for the period
      const [revenueBalances, expenseBalances] = await Promise.all([
        this.generalLedgerRepository.getAccountBalancesByType(organizationId, 'REVENUE', periodTo),
        this.generalLedgerRepository.getAccountBalancesByType(organizationId, 'EXPENSE', periodTo),
      ]);

      // Filter balances for the period (this is a simplified approach)
      // In a real implementation, you'd need to calculate period-specific balances
      
      // Categorize revenue
      const operatingRevenue = revenueBalances.filter(account => 
        account.accountCode.startsWith('41') || account.accountCode.startsWith('42')
      );
      const nonOperatingRevenue = revenueBalances.filter(account => 
        account.accountCode.startsWith('43') || parseInt(account.accountCode) >= 4400
      );

      // Categorize expenses
      const costOfGoodsSold = expenseBalances.filter(account => 
        account.accountCode.startsWith('5')
      );
      const operatingExpenses = expenseBalances.filter(account => 
        account.accountCode.startsWith('6')
      );
      const nonOperatingExpenses = expenseBalances.filter(account => 
        account.accountCode.startsWith('7') || account.accountCode.startsWith('8') || account.accountCode.startsWith('9')
      );

      // Calculate totals
      const totalRevenue = revenueBalances.reduce((sum, account) => sum + account.balance, 0);
      const totalCOGS = costOfGoodsSold.reduce((sum, account) => sum + account.balance, 0);
      const totalOperatingExpenses = operatingExpenses.reduce((sum, account) => sum + account.balance, 0);
      const totalNonOperatingExpenses = nonOperatingExpenses.reduce((sum, account) => sum + account.balance, 0);
      const totalExpenses = totalCOGS + totalOperatingExpenses + totalNonOperatingExpenses;

      const grossProfit = totalRevenue - totalCOGS;
      const operatingIncome = grossProfit - totalOperatingExpenses;
      const netIncome = operatingIncome - totalNonOperatingExpenses;

      const incomeStatement: IncomeStatementDto = {
        revenue: {
          operatingRevenue,
          nonOperatingRevenue,
          totalRevenue,
        },
        expenses: {
          costOfGoodsSold,
          operatingExpenses,
          nonOperatingExpenses,
          totalExpenses,
        },
        grossProfit,
        operatingIncome,
        netIncome,
        periodFrom,
        periodTo,
      };

      this.logger.log(`Generated income statement. Revenue: ${totalRevenue}, Expenses: ${totalExpenses}, Net Income: ${netIncome}`);
      return incomeStatement;
    } catch (error) {
      this.logger.error(`Failed to generate income statement: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate income statement');
    }
  }

  /**
   * Get account balances by type
   */
  async getAccountBalancesByType(
    organizationId: string,
    accountType: AccountType,
    asOfDate?: Date
  ): Promise<AccountBalance[]> {
    try {
      return await this.generalLedgerRepository.getAccountBalancesByType(organizationId, accountType, asOfDate);
    } catch (error) {
      this.logger.error(`Failed to get account balances by type: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get account balances by type');
    }
  }

  /**
   * Get cash flow statement data
   */
  async getCashFlowData(organizationId: string, periodFrom: Date, periodTo: Date): Promise<{
    operatingActivities: AccountBalance[];
    investingActivities: AccountBalance[];
    financingActivities: AccountBalance[];
    netCashFlow: number;
  }> {
    try {
      this.logger.log(`Getting cash flow data for organization: ${organizationId} from ${periodFrom.toISOString()} to ${periodTo.toISOString()}`);

      // Get cash and cash equivalent accounts
      const cashAccounts = await this.accountRepository.findMany(organizationId, {
        search: 'cash',
        limit: 100,
      });

      // This is a simplified implementation
      // In a real system, you'd need to categorize cash flows properly
      const operatingActivities: AccountBalance[] = [];
      const investingActivities: AccountBalance[] = [];
      const financingActivities: AccountBalance[] = [];

      // Calculate net cash flow
      const netCashFlow = 0; // Placeholder

      return {
        operatingActivities,
        investingActivities,
        financingActivities,
        netCashFlow,
      };
    } catch (error) {
      this.logger.error(`Failed to get cash flow data: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get cash flow data');
    }
  }

  /**
   * Validate general ledger integrity
   */
  async validateGeneralLedgerIntegrity(organizationId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      this.logger.log(`Validating general ledger integrity for organization: ${organizationId}`);

      const errors: string[] = [];
      const warnings: string[] = [];

      // Generate trial balance to check if debits equal credits
      const trialBalance = await this.generateTrialBalance(organizationId, new Date());
      
      if (!trialBalance.isBalanced) {
        errors.push(`Trial balance is not balanced. Debits: ${trialBalance.totalDebits}, Credits: ${trialBalance.totalCredits}`);
      }

      // Check for accounts with unusual balances
      for (const account of trialBalance.accounts) {
        if (account.normalBalance === 'DEBIT' && account.balance < 0) {
          warnings.push(`Debit account ${account.accountCode} has negative balance: ${account.balance}`);
        }
        if (account.normalBalance === 'CREDIT' && account.balance < 0) {
          warnings.push(`Credit account ${account.accountCode} has negative balance: ${account.balance}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Failed to validate general ledger integrity: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to validate general ledger integrity');
    }
  }
}
