import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  Account,
  AccountSubType,
  AccountType,
  NormalBalance,
  Prisma,
} from '@prisma/client';

export interface CreateAccountDto {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountSubType?: AccountSubType;
  parentAccountId?: string;
  normalBalance: NormalBalance;
  isActive?: boolean;
  isSystem?: boolean;
  isBankAccount?: boolean;
  isTaxAccount?: boolean;
  currentBalance?: number;
  currency?: string;
  description?: string;
  accountNumber?: string;
  bankName?: string;
  taxCode?: string;
}

export interface UpdateAccountDto {
  accountName?: string;
  accountType?: AccountType;
  accountSubType?: AccountSubType;
  parentAccountId?: string;
  normalBalance?: NormalBalance;
  isActive?: boolean;
  isBankAccount?: boolean;
  isTaxAccount?: boolean;
  currentBalance?: number;
  description?: string;
  accountNumber?: string;
  bankName?: string;
  taxCode?: string;
}

export interface AccountQueryDto {
  page?: number;
  limit?: number;
  accountType?: AccountType;
  accountSubType?: AccountSubType;
  parentAccountId?: string;
  isActive?: boolean;
  isSystem?: boolean;
  isBankAccount?: boolean;
  isTaxAccount?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AccountWithChildren extends Account {
  childAccounts?: AccountWithChildren[];
  parentAccount?: Account;
  _count?: {
    generalLedgerEntries: number;
    debitEntries: number;
    creditEntries: number;
  };
}

@Injectable()
export class AccountRepository {
  private readonly logger = new Logger(AccountRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new account
   */
  async create(
    organizationId: string,
    data: CreateAccountDto
  ): Promise<Account> {
    try {
      // Check if account code already exists
      const existingAccount = await this.findByCode(
        organizationId,
        data.accountCode
      );
      if (existingAccount) {
        throw new Error(`Account with code ${data.accountCode} already exists`);
      }

      return await this.prisma.account.create({
        data: {
          organizationId,
          accountCode: data.accountCode,
          accountName: data.accountName,
          accountType: data.accountType,
          accountSubType: data.accountSubType,
          parentAccountId: data.parentAccountId,
          normalBalance: data.normalBalance,
          isActive: data.isActive ?? true,
          isSystem: data.isSystem ?? false,
          isBankAccount: data.isBankAccount ?? false,
          isTaxAccount: data.isTaxAccount ?? false,
          currentBalance: data.currentBalance ?? 0,
          currency: data.currency ?? 'ZMW',
          description: data.description,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          taxCode: data.taxCode,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create account: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Find account by ID
   */
  async findById(
    organizationId: string,
    id: string
  ): Promise<AccountWithChildren | null> {
    try {
      return await this.prisma.account.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
        include: {
          parentAccount: true,
          childAccounts: {
            where: { deletedAt: null },
            orderBy: { accountCode: 'asc' },
          },
          _count: {
            select: {
              generalLedgerEntries: true,
              debitEntries: true,
              creditEntries: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find account by ID: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Find account by code
   */
  async findByCode(
    organizationId: string,
    accountCode: string
  ): Promise<Account | null> {
    try {
      return await this.prisma.account.findFirst({
        where: {
          organizationId,
          accountCode,
          deletedAt: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find account by code: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Find all accounts with pagination and filtering
   */
  async findMany(
    organizationId: string,
    query: AccountQueryDto
  ): Promise<{
    accounts: AccountWithChildren[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 50;
      const skip = (page - 1) * limit;

      const where: Prisma.AccountWhereInput = {
        organizationId,
        deletedAt: null,
        ...(query.accountType && { accountType: query.accountType }),
        ...(query.accountSubType && { accountSubType: query.accountSubType }),
        ...(query.parentAccountId && {
          parentAccountId: query.parentAccountId,
        }),
        ...(query.isActive !== undefined && { isActive: query.isActive }),
        ...(query.isSystem !== undefined && { isSystem: query.isSystem }),
        ...(query.isBankAccount !== undefined && {
          isBankAccount: query.isBankAccount,
        }),
        ...(query.isTaxAccount !== undefined && {
          isTaxAccount: query.isTaxAccount,
        }),
        ...(query.search && {
          OR: [
            { accountCode: { contains: query.search, mode: 'insensitive' } },
            { accountName: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      };

      const orderBy: Prisma.AccountOrderByWithRelationInput = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'asc';
      } else {
        orderBy.accountCode = 'asc';
      }

      const [accounts, total] = await Promise.all([
        this.prisma.account.findMany({
          where,
          include: {
            parentAccount: true,
            childAccounts: {
              where: { deletedAt: null },
              orderBy: { accountCode: 'asc' },
            },
            _count: {
              select: {
                generalLedgerEntries: true,
                debitEntries: true,
                creditEntries: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.account.count({ where }),
      ]);

      return {
        accounts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to find accounts: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get account hierarchy (tree structure)
   */
  async getAccountHierarchy(
    organizationId: string,
    accountType?: AccountType
  ): Promise<AccountWithChildren[]> {
    try {
      const where: Prisma.AccountWhereInput = {
        organizationId,
        deletedAt: null,
        parentAccountId: null, // Root accounts only
        ...(accountType && { accountType }),
      };

      return await this.prisma.account.findMany({
        where,
        include: {
          childAccounts: {
            where: { deletedAt: null },
            include: {
              childAccounts: {
                where: { deletedAt: null },
                orderBy: { accountCode: 'asc' },
              },
            },
            orderBy: { accountCode: 'asc' },
          },
        },
        orderBy: { accountCode: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get account hierarchy: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Update account
   */
  async update(
    organizationId: string,
    id: string,
    data: UpdateAccountDto
  ): Promise<Account> {
    try {
      // Verify account exists and belongs to organization
      const existingAccount = await this.findById(organizationId, id);
      if (!existingAccount) {
        throw new Error('Account not found');
      }

      // Prevent updating system accounts
      if (existingAccount.isSystem) {
        throw new Error('Cannot update system accounts');
      }

      return await this.prisma.account.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update account: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Update account balance
   */
  async updateBalance(
    organizationId: string,
    accountId: string,
    newBalance: number
  ): Promise<Account> {
    try {
      return await this.prisma.account.update({
        where: {
          id: accountId,
          organizationId,
        },
        data: {
          currentBalance: newBalance,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update account balance: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Soft delete account
   */
  async delete(organizationId: string, id: string): Promise<Account> {
    try {
      // Verify account exists and belongs to organization
      const existingAccount = await this.findById(organizationId, id);
      if (!existingAccount) {
        throw new Error('Account not found');
      }

      // Prevent deleting system accounts
      if (existingAccount.isSystem) {
        throw new Error('Cannot delete system accounts');
      }

      // Check if account has transactions
      if (
        existingAccount._count &&
        (existingAccount._count.generalLedgerEntries > 0 ||
          existingAccount._count.debitEntries > 0 ||
          existingAccount._count.creditEntries > 0)
      ) {
        throw new Error('Cannot delete account with existing transactions');
      }

      return await this.prisma.account.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete account: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get accounts by type
   */
  async findByType(
    organizationId: string,
    accountType: AccountType
  ): Promise<Account[]> {
    try {
      return await this.prisma.account.findMany({
        where: {
          organizationId,
          accountType,
          deletedAt: null,
          isActive: true,
        },
        orderBy: { accountCode: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find accounts by type: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get bank accounts
   */
  async getBankAccounts(organizationId: string): Promise<Account[]> {
    try {
      return await this.prisma.account.findMany({
        where: {
          organizationId,
          isBankAccount: true,
          deletedAt: null,
          isActive: true,
        },
        orderBy: { accountCode: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get bank accounts: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get tax accounts
   */
  async getTaxAccounts(organizationId: string): Promise<Account[]> {
    try {
      return await this.prisma.account.findMany({
        where: {
          organizationId,
          isTaxAccount: true,
          deletedAt: null,
          isActive: true,
        },
        orderBy: { accountCode: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get tax accounts: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
