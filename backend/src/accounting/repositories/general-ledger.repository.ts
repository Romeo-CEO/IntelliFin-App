import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GeneralLedgerEntry, SourceType, Prisma } from '@prisma/client';

export interface CreateGeneralLedgerEntryDto {
  accountId: string;
  journalEntryId: string;
  entryDate: Date;
  debitAmount?: number;
  creditAmount?: number;
  description: string;
  reference?: string;
  sourceType?: SourceType;
  sourceId?: string;
}

export interface GeneralLedgerQueryDto {
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sourceType?: SourceType;
  sourceId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GeneralLedgerEntryWithAccount extends GeneralLedgerEntry {
  account: {
    accountCode: string;
    accountName: string;
    accountType: string;
    normalBalance: string;
  };
  journalEntry: {
    entryNumber: string;
    entryType: string;
    isPosted: boolean;
  };
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  runningBalance: number;
}

export interface TrialBalance {
  accounts: AccountBalance[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  asOfDate: Date;
}

@Injectable()
export class GeneralLedgerRepository {
  private readonly logger = new Logger(GeneralLedgerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create general ledger entries from journal entry
   */
  async createFromJournalEntry(
    organizationId: string,
    journalEntryId: string,
    entries: CreateGeneralLedgerEntryDto[]
  ): Promise<GeneralLedgerEntry[]> {
    try {
      const createdEntries: GeneralLedgerEntry[] = [];

      for (const entry of entries) {
        // Get current account balance
        const currentBalance = await this.getAccountBalance(organizationId, entry.accountId, entry.entryDate);
        
        // Calculate new running balance
        const debitAmount = entry.debitAmount || 0;
        const creditAmount = entry.creditAmount || 0;
        
        // Get account normal balance to determine how to calculate running balance
        const account = await this.prisma.account.findUnique({
          where: { id: entry.accountId },
          select: { normalBalance: true },
        });

        if (!account) {
          throw new Error(`Account not found: ${entry.accountId}`);
        }

        let newRunningBalance: number;
        if (account.normalBalance === 'DEBIT') {
          newRunningBalance = currentBalance + debitAmount - creditAmount;
        } else {
          newRunningBalance = currentBalance + creditAmount - debitAmount;
        }

        const ledgerEntry = await this.prisma.generalLedgerEntry.create({
          data: {
            organizationId,
            accountId: entry.accountId,
            journalEntryId: entry.journalEntryId,
            entryDate: entry.entryDate,
            debitAmount: debitAmount,
            creditAmount: creditAmount,
            runningBalance: newRunningBalance,
            description: entry.description,
            reference: entry.reference,
            sourceType: entry.sourceType,
            sourceId: entry.sourceId,
          },
        });

        // Update account current balance
        await this.prisma.account.update({
          where: { id: entry.accountId },
          data: { currentBalance: newRunningBalance },
        });

        createdEntries.push(ledgerEntry);
      }

      return createdEntries;
    } catch (error) {
      this.logger.error(`Failed to create general ledger entries: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get general ledger entries with filtering and pagination
   */
  async findMany(organizationId: string, query: GeneralLedgerQueryDto): Promise<{
    entries: GeneralLedgerEntryWithAccount[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 100;
      const skip = (page - 1) * limit;

      const where: Prisma.GeneralLedgerEntryWhereInput = {
        organizationId,
        ...(query.accountId && { accountId: query.accountId }),
        ...(query.sourceType && { sourceType: query.sourceType }),
        ...(query.sourceId && { sourceId: query.sourceId }),
        ...(query.dateFrom && query.dateTo && {
          entryDate: {
            gte: query.dateFrom,
            lte: query.dateTo,
          },
        }),
      };

      const orderBy: Prisma.GeneralLedgerEntryOrderByWithRelationInput = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'desc';
      } else {
        orderBy.entryDate = 'desc';
      }

      const [entries, total] = await Promise.all([
        this.prisma.generalLedgerEntry.findMany({
          where,
          include: {
            account: {
              select: {
                accountCode: true,
                accountName: true,
                accountType: true,
                normalBalance: true,
              },
            },
            journalEntry: {
              select: {
                entryNumber: true,
                entryType: true,
                isPosted: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.generalLedgerEntry.count({ where }),
      ]);

      return {
        entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to find general ledger entries: ${error.message}`, error.stack);
      throw error;
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
      const where: Prisma.GeneralLedgerEntryWhereInput = {
        organizationId,
        accountId,
        ...(dateFrom && dateTo && {
          entryDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
      };

      return await this.prisma.generalLedgerEntry.findMany({
        where,
        include: {
          account: {
            select: {
              accountCode: true,
              accountName: true,
              accountType: true,
              normalBalance: true,
            },
          },
          journalEntry: {
            select: {
              entryNumber: true,
              entryType: true,
              isPosted: true,
            },
          },
        },
        orderBy: [
          { entryDate: 'asc' },
          { createdAt: 'asc' },
        ],
      });
    } catch (error) {
      this.logger.error(`Failed to get account ledger: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get account balance as of a specific date
   */
  async getAccountBalance(organizationId: string, accountId: string, asOfDate?: Date): Promise<number> {
    try {
      const where: Prisma.GeneralLedgerEntryWhereInput = {
        organizationId,
        accountId,
        ...(asOfDate && {
          entryDate: {
            lte: asOfDate,
          },
        }),
      };

      const lastEntry = await this.prisma.generalLedgerEntry.findFirst({
        where,
        orderBy: [
          { entryDate: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          runningBalance: true,
        },
      });

      return lastEntry?.runningBalance || 0;
    } catch (error) {
      this.logger.error(`Failed to get account balance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate trial balance
   */
  async generateTrialBalance(organizationId: string, asOfDate: Date): Promise<TrialBalance> {
    try {
      // Get all accounts with their balances
      const accounts = await this.prisma.account.findMany({
        where: {
          organizationId,
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          accountCode: true,
          accountName: true,
          accountType: true,
          normalBalance: true,
        },
        orderBy: { accountCode: 'asc' },
      });

      const accountBalances: AccountBalance[] = [];
      let totalDebits = 0;
      let totalCredits = 0;

      for (const account of accounts) {
        // Get total debits and credits for this account
        const aggregates = await this.prisma.generalLedgerEntry.aggregate({
          where: {
            organizationId,
            accountId: account.id,
            entryDate: {
              lte: asOfDate,
            },
          },
          _sum: {
            debitAmount: true,
            creditAmount: true,
          },
        });

        const debitTotal = aggregates._sum.debitAmount || 0;
        const creditTotal = aggregates._sum.creditAmount || 0;

        // Calculate balance based on normal balance
        let balance: number;
        if (account.normalBalance === 'DEBIT') {
          balance = debitTotal - creditTotal;
        } else {
          balance = creditTotal - debitTotal;
        }

        const runningBalance = await this.getAccountBalance(organizationId, account.id, asOfDate);

        const accountBalance: AccountBalance = {
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          normalBalance: account.normalBalance,
          debitTotal,
          creditTotal,
          balance,
          runningBalance,
        };

        accountBalances.push(accountBalance);

        // Add to trial balance totals
        if (account.normalBalance === 'DEBIT' && balance > 0) {
          totalDebits += balance;
        } else if (account.normalBalance === 'CREDIT' && balance > 0) {
          totalCredits += balance;
        }
      }

      return {
        accounts: accountBalances,
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        asOfDate,
      };
    } catch (error) {
      this.logger.error(`Failed to generate trial balance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get account balances by type
   */
  async getAccountBalancesByType(
    organizationId: string,
    accountType: string,
    asOfDate?: Date
  ): Promise<AccountBalance[]> {
    try {
      const accounts = await this.prisma.account.findMany({
        where: {
          organizationId,
          accountType: accountType as any,
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          accountCode: true,
          accountName: true,
          accountType: true,
          normalBalance: true,
        },
        orderBy: { accountCode: 'asc' },
      });

      const balances: AccountBalance[] = [];

      for (const account of accounts) {
        const aggregates = await this.prisma.generalLedgerEntry.aggregate({
          where: {
            organizationId,
            accountId: account.id,
            ...(asOfDate && {
              entryDate: {
                lte: asOfDate,
              },
            }),
          },
          _sum: {
            debitAmount: true,
            creditAmount: true,
          },
        });

        const debitTotal = aggregates._sum.debitAmount || 0;
        const creditTotal = aggregates._sum.creditAmount || 0;

        let balance: number;
        if (account.normalBalance === 'DEBIT') {
          balance = debitTotal - creditTotal;
        } else {
          balance = creditTotal - debitTotal;
        }

        const runningBalance = await this.getAccountBalance(organizationId, account.id, asOfDate);

        balances.push({
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          normalBalance: account.normalBalance,
          debitTotal,
          creditTotal,
          balance,
          runningBalance,
        });
      }

      return balances;
    } catch (error) {
      this.logger.error(`Failed to get account balances by type: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete general ledger entries for a journal entry (when reversing)
   */
  async deleteByJournalEntry(organizationId: string, journalEntryId: string): Promise<void> {
    try {
      // Get all entries to reverse account balances
      const entries = await this.prisma.generalLedgerEntry.findMany({
        where: {
          organizationId,
          journalEntryId,
        },
        include: {
          account: {
            select: {
              id: true,
              normalBalance: true,
            },
          },
        },
      });

      // Reverse account balances
      for (const entry of entries) {
        const debitAmount = entry.debitAmount || 0;
        const creditAmount = entry.creditAmount || 0;

        let balanceAdjustment: number;
        if (entry.account.normalBalance === 'DEBIT') {
          balanceAdjustment = creditAmount - debitAmount; // Reverse the original effect
        } else {
          balanceAdjustment = debitAmount - creditAmount; // Reverse the original effect
        }

        await this.prisma.account.update({
          where: { id: entry.accountId },
          data: {
            currentBalance: {
              increment: balanceAdjustment,
            },
          },
        });
      }

      // Delete the entries
      await this.prisma.generalLedgerEntry.deleteMany({
        where: {
          organizationId,
          journalEntryId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to delete general ledger entries: ${error.message}`, error.stack);
      throw error;
    }
  }
}
