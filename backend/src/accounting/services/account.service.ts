import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountRepository, CreateAccountDto, UpdateAccountDto, AccountQueryDto, AccountWithChildren } from '../repositories/account.repository';
import { ChartOfAccountsService, ZambianAccountCode } from '../chart-of-accounts.service';
import { Account, AccountType, AccountSubType, NormalBalance } from '@prisma/client';

export interface InitializeChartOfAccountsDto {
  organizationId: string;
  includeDefaultAccounts?: boolean;
}

export interface AccountSummaryDto {
  totalAccounts: number;
  accountsByType: Record<AccountType, number>;
  bankAccounts: number;
  taxAccounts: number;
  systemAccounts: number;
}

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly chartOfAccountsService: ChartOfAccountsService,
  ) {}

  /**
   * Initialize chart of accounts for a new organization
   */
  async initializeChartOfAccounts(data: InitializeChartOfAccountsDto): Promise<Account[]> {
    try {
      this.logger.log(`Initializing chart of accounts for organization: ${data.organizationId}`);

      if (!data.includeDefaultAccounts) {
        return [];
      }

      const zambianAccounts = this.chartOfAccountsService.getZambianChartOfAccounts();
      const createdAccounts: Account[] = [];

      // Create accounts in order (parents first)
      const accountsToCreate = this.sortAccountsByHierarchy(zambianAccounts);

      for (const zambianAccount of accountsToCreate) {
        try {
          // Find parent account if exists
          let parentAccountId: string | undefined;
          if (zambianAccount.parentCode) {
            const parentAccount = createdAccounts.find(
              acc => acc.accountCode === zambianAccount.parentCode
            );
            parentAccountId = parentAccount?.id;
          }

          const accountData: CreateAccountDto = {
            accountCode: zambianAccount.code,
            accountName: zambianAccount.name,
            accountType: zambianAccount.category as AccountType,
            accountSubType: this.mapSubcategoryToAccountSubType(zambianAccount.subcategory),
            parentAccountId,
            normalBalance: this.determineNormalBalance(zambianAccount.category as AccountType),
            isSystem: true, // Default accounts are system accounts
            isBankAccount: this.isBankAccount(zambianAccount),
            isTaxAccount: this.isTaxAccount(zambianAccount),
            description: zambianAccount.description,
            taxCode: this.getTaxCode(zambianAccount),
          };

          const createdAccount = await this.accountRepository.create(data.organizationId, accountData);
          createdAccounts.push(createdAccount);

          this.logger.debug(`Created account: ${createdAccount.accountCode} - ${createdAccount.accountName}`);
        } catch (error) {
          this.logger.warn(`Failed to create account ${zambianAccount.code}: ${error.message}`);
          // Continue with other accounts
        }
      }

      this.logger.log(`Successfully initialized ${createdAccounts.length} accounts for organization: ${data.organizationId}`);
      return createdAccounts;
    } catch (error) {
      this.logger.error(`Failed to initialize chart of accounts: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to initialize chart of accounts');
    }
  }

  /**
   * Create a new account
   */
  async createAccount(organizationId: string, data: CreateAccountDto): Promise<Account> {
    try {
      // Validate account code format
      this.validateAccountCode(data.accountCode);

      // Validate parent account if specified
      if (data.parentAccountId) {
        const parentAccount = await this.accountRepository.findById(organizationId, data.parentAccountId);
        if (!parentAccount) {
          throw new BadRequestException('Parent account not found');
        }

        // Ensure parent account is of compatible type
        if (!this.isCompatibleAccountType(data.accountType, parentAccount.accountType)) {
          throw new BadRequestException('Incompatible account type with parent account');
        }
      }

      return await this.accountRepository.create(organizationId, data);
    } catch (error) {
      this.logger.error(`Failed to create account: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create account');
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(organizationId: string, id: string): Promise<AccountWithChildren> {
    try {
      const account = await this.accountRepository.findById(organizationId, id);
      if (!account) {
        throw new NotFoundException('Account not found');
      }
      return account;
    } catch (error) {
      this.logger.error(`Failed to get account: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get account');
    }
  }

  /**
   * Get account by code
   */
  async getAccountByCode(organizationId: string, accountCode: string): Promise<Account> {
    try {
      const account = await this.accountRepository.findByCode(organizationId, accountCode);
      if (!account) {
        throw new NotFoundException('Account not found');
      }
      return account;
    } catch (error) {
      this.logger.error(`Failed to get account by code: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get account');
    }
  }

  /**
   * Get accounts with pagination and filtering
   */
  async getAccounts(organizationId: string, query: AccountQueryDto) {
    try {
      return await this.accountRepository.findMany(organizationId, query);
    } catch (error) {
      this.logger.error(`Failed to get accounts: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get accounts');
    }
  }

  /**
   * Get account hierarchy
   */
  async getAccountHierarchy(organizationId: string, accountType?: AccountType): Promise<AccountWithChildren[]> {
    try {
      return await this.accountRepository.getAccountHierarchy(organizationId, accountType);
    } catch (error) {
      this.logger.error(`Failed to get account hierarchy: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get account hierarchy');
    }
  }

  /**
   * Update account
   */
  async updateAccount(organizationId: string, id: string, data: UpdateAccountDto): Promise<Account> {
    try {
      // Validate parent account if being changed
      if (data.parentAccountId) {
        const parentAccount = await this.accountRepository.findById(organizationId, data.parentAccountId);
        if (!parentAccount) {
          throw new BadRequestException('Parent account not found');
        }

        // Prevent circular references
        if (await this.wouldCreateCircularReference(organizationId, id, data.parentAccountId)) {
          throw new BadRequestException('Cannot create circular reference in account hierarchy');
        }
      }

      return await this.accountRepository.update(organizationId, id, data);
    } catch (error) {
      this.logger.error(`Failed to update account: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update account');
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(organizationId: string, id: string): Promise<Account> {
    try {
      return await this.accountRepository.delete(organizationId, id);
    } catch (error) {
      this.logger.error(`Failed to delete account: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete account');
    }
  }

  /**
   * Get accounts by type
   */
  async getAccountsByType(organizationId: string, accountType: AccountType): Promise<Account[]> {
    try {
      return await this.accountRepository.findByType(organizationId, accountType);
    } catch (error) {
      this.logger.error(`Failed to get accounts by type: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get accounts by type');
    }
  }

  /**
   * Get bank accounts
   */
  async getBankAccounts(organizationId: string): Promise<Account[]> {
    try {
      return await this.accountRepository.getBankAccounts(organizationId);
    } catch (error) {
      this.logger.error(`Failed to get bank accounts: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get bank accounts');
    }
  }

  /**
   * Get tax accounts
   */
  async getTaxAccounts(organizationId: string): Promise<Account[]> {
    try {
      return await this.accountRepository.getTaxAccounts(organizationId);
    } catch (error) {
      this.logger.error(`Failed to get tax accounts: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get tax accounts');
    }
  }

  /**
   * Get account summary statistics
   */
  async getAccountSummary(organizationId: string): Promise<AccountSummaryDto> {
    try {
      const allAccounts = await this.accountRepository.findMany(organizationId, { limit: 1000 });
      
      const summary: AccountSummaryDto = {
        totalAccounts: allAccounts.total,
        accountsByType: {
          ASSET: 0,
          LIABILITY: 0,
          EQUITY: 0,
          REVENUE: 0,
          EXPENSE: 0,
        },
        bankAccounts: 0,
        taxAccounts: 0,
        systemAccounts: 0,
      };

      allAccounts.accounts.forEach(account => {
        summary.accountsByType[account.accountType]++;
        if (account.isBankAccount) summary.bankAccounts++;
        if (account.isTaxAccount) summary.taxAccounts++;
        if (account.isSystem) summary.systemAccounts++;
      });

      return summary;
    } catch (error) {
      this.logger.error(`Failed to get account summary: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get account summary');
    }
  }

  // Private helper methods

  private sortAccountsByHierarchy(accounts: ZambianAccountCode[]): ZambianAccountCode[] {
    const sorted: ZambianAccountCode[] = [];
    const remaining = [...accounts];

    while (remaining.length > 0) {
      const beforeLength = remaining.length;
      
      for (let i = remaining.length - 1; i >= 0; i--) {
        const account = remaining[i];
        
        // If no parent or parent already exists in sorted, add this account
        if (!account.parentCode || sorted.some(s => s.code === account.parentCode)) {
          sorted.push(account);
          remaining.splice(i, 1);
        }
      }

      // Prevent infinite loop
      if (remaining.length === beforeLength) {
        // Add remaining accounts (orphaned)
        sorted.push(...remaining);
        break;
      }
    }

    return sorted;
  }

  private mapSubcategoryToAccountSubType(subcategory: string): AccountSubType | undefined {
    const mapping: Record<string, AccountSubType> = {
      'Current Assets': 'CURRENT_ASSET',
      'Fixed Assets': 'FIXED_ASSET',
      'Current Liabilities': 'CURRENT_LIABILITY',
      'Equity': 'OWNER_EQUITY',
      'Operating Revenue': 'OPERATING_REVENUE',
      'Other Revenue': 'NON_OPERATING_REVENUE',
      'Cost of Sales': 'COST_OF_GOODS_SOLD',
      'Operating Expenses': 'OPERATING_EXPENSE',
      'Non-Cash Expenses': 'OPERATING_EXPENSE',
      'Financial Expenses': 'NON_OPERATING_EXPENSE',
      'Tax Expenses': 'TAX_EXPENSE',
    };

    return mapping[subcategory];
  }

  private determineNormalBalance(accountType: AccountType): NormalBalance {
    switch (accountType) {
      case 'ASSET':
      case 'EXPENSE':
        return 'DEBIT';
      case 'LIABILITY':
      case 'EQUITY':
      case 'REVENUE':
        return 'CREDIT';
      default:
        return 'DEBIT';
    }
  }

  private isBankAccount(account: ZambianAccountCode): boolean {
    return account.name.toLowerCase().includes('bank') || 
           account.name.toLowerCase().includes('mobile money') ||
           account.code.startsWith('112') || // Bank Accounts
           account.code.startsWith('113'); // Mobile Money Accounts
  }

  private isTaxAccount(account: ZambianAccountCode): boolean {
    return account.name.toLowerCase().includes('vat') ||
           account.name.toLowerCase().includes('paye') ||
           account.name.toLowerCase().includes('withholding') ||
           account.name.toLowerCase().includes('tax');
  }

  private getTaxCode(account: ZambianAccountCode): string | undefined {
    if (account.name.includes('VAT')) return 'VAT';
    if (account.name.includes('PAYE')) return 'PAYE';
    if (account.name.includes('Withholding')) return 'WHT';
    return undefined;
  }

  private validateAccountCode(accountCode: string): void {
    if (!/^\d{4}$/.test(accountCode)) {
      throw new BadRequestException('Account code must be a 4-digit number');
    }
  }

  private isCompatibleAccountType(childType: AccountType, parentType: AccountType): boolean {
    return childType === parentType;
  }

  private async wouldCreateCircularReference(
    organizationId: string,
    accountId: string,
    newParentId: string
  ): Promise<boolean> {
    let currentParentId = newParentId;
    
    while (currentParentId) {
      if (currentParentId === accountId) {
        return true;
      }
      
      const parentAccount = await this.accountRepository.findById(organizationId, currentParentId);
      currentParentId = parentAccount?.parentAccountId || null;
    }
    
    return false;
  }
}
