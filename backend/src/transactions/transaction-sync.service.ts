import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateTransactionData,
  TransactionRepository,
} from './transaction.repository';
import { AirtelMoneyApiClient } from '../integrations/airtel-money/airtel-money-api.client';
import { AirtelMoneyTokenRepository } from '../integrations/airtel-money/airtel-money-token.repository';
import {
  MobileMoneyAccount,
  MobileMoneyProvider,
  SyncJob,
  SyncJobStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import {
  AirtelTransactionDto,
  GetTransactionsDto,
} from '../integrations/airtel-money/dto/airtel-money-api.dto';

export interface SyncResult {
  accountId: string;
  success: boolean;
  newTransactions: number;
  updatedTransactions: number;
  totalProcessed: number;
  errors: string[];
  syncDuration: number;
  lastSyncDate: Date;
}

export interface SyncOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  forceFullSync?: boolean;
  isManual?: boolean;
}

@Injectable()
export class TransactionSyncService {
  private readonly logger = new Logger(TransactionSyncService.name);
  private readonly DEFAULT_SYNC_LIMIT = 100;
  private readonly MAX_SYNC_LIMIT = 500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionRepository: TransactionRepository,
    private readonly airtelApiClient: AirtelMoneyApiClient,
    private readonly tokenRepository: AirtelMoneyTokenRepository
  ) {}

  /**
   * Sync transactions for a specific account
   */
  async syncAccountTransactions(
    accountId: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const syncResult: SyncResult = {
      accountId,
      success: false,
      newTransactions: 0,
      updatedTransactions: 0,
      totalProcessed: 0,
      errors: [],
      syncDuration: 0,
      lastSyncDate: new Date(),
    };

    let syncJob: SyncJob | null = null;

    try {
      // Get account details
      const account = await this.getAccountWithValidation(accountId);
      if (!account) {
        throw new Error(`Account ${accountId} not found or not linked`);
      }

      // Create sync job record
      syncJob = await this.createSyncJob(account, options);

      // Get access token
      const tokens = await this.tokenRepository.getTokens(accountId);
      if (!tokens) {
        throw new Error('No valid tokens found for account');
      }

      // Check if token needs refresh
      const isExpired = await this.tokenRepository.areTokensExpired(accountId);
      let accessToken = tokens.accessToken;

      if (isExpired) {
        this.logger.debug(`Refreshing expired token for account: ${accountId}`);
        const refreshed = await this.refreshTokenIfNeeded(accountId);
        if (!refreshed) {
          throw new Error('Failed to refresh expired token');
        }

        const newTokens = await this.tokenRepository.getTokens(accountId);
        accessToken = newTokens?.accessToken || tokens.accessToken;
      }

      // Determine sync date range
      const { startDate, endDate } = await this.determineSyncDateRange(
        account,
        options
      );

      // Perform incremental sync
      const syncData = await this.performIncrementalSync(
        account,
        accessToken,
        startDate,
        endDate,
        options
      );

      syncResult.newTransactions = syncData.newTransactions;
      syncResult.updatedTransactions = syncData.updatedTransactions;
      syncResult.totalProcessed = syncData.totalProcessed;
      syncResult.success = true;

      // Update account last sync time and balance
      await this.updateAccountAfterSync(account, syncData.latestBalance);

      // Update sync job as completed
      if (syncJob) {
        await this.updateSyncJob(syncJob.id, {
          status: SyncJobStatus.COMPLETED,
          transactionsProcessed: syncResult.totalProcessed,
          newTransactions: syncResult.newTransactions,
          completedAt: new Date(),
        });
      }

      this.logger.log(
        `Successfully synced account ${accountId}: ` +
          `${syncResult.newTransactions} new, ${syncResult.updatedTransactions} updated`
      );
    } catch (error: any) {
      syncResult.success = false;
      syncResult.errors.push(error.message);

      // Update sync job as failed
      if (syncJob) {
        await this.updateSyncJob(syncJob.id, {
          status: SyncJobStatus.FAILED,
          errorMessage: error.message,
          completedAt: new Date(),
        });
      }

      this.logger.error(`Failed to sync account ${accountId}:`, error);
      throw error;
    } finally {
      syncResult.syncDuration = Date.now() - startTime;
    }

    return syncResult;
  }

  /**
   * Sync transactions for all linked accounts in an organization
   */
  async syncAllAccountsForOrganization(
    organizationId: string
  ): Promise<SyncResult[]> {
    const accounts = await this.prisma.mobileMoneyAccount.findMany({
      where: {
        organizationId,
        isLinked: true,
        provider: MobileMoneyProvider.AIRTEL_MONEY,
      },
    });

    const results: SyncResult[] = [];

    for (const account of accounts) {
      try {
        const result = await this.syncAccountTransactions(account.id);
        results.push(result);
      } catch (error) {
        results.push({
          accountId: account.id,
          success: false,
          newTransactions: 0,
          updatedTransactions: 0,
          totalProcessed: 0,
          errors: [error.message],
          syncDuration: 0,
          lastSyncDate: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Perform incremental sync with pagination
   */
  private async performIncrementalSync(
    account: MobileMoneyAccount,
    accessToken: string,
    startDate: Date,
    endDate: Date,
    options: SyncOptions
  ): Promise<{
    newTransactions: number;
    updatedTransactions: number;
    totalProcessed: number;
    latestBalance: number | null;
  }> {
    let newTransactions = 0;
    let updatedTransactions = 0;
    let totalProcessed = 0;
    let latestBalance: number | null = null;
    let offset = 0;
    const limit = Math.min(
      options.limit || this.DEFAULT_SYNC_LIMIT,
      this.MAX_SYNC_LIMIT
    );

    while (true) {
      const params: GetTransactionsDto = {
        limit,
        offset,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };

      const response = await this.airtelApiClient.getTransactions(
        accessToken,
        params
      );

      if (!response.transactions || response.transactions.length === 0) {
        break;
      }

      // Process transactions in batch
      const batchResult = await this.processTransactionBatch(
        account,
        response.transactions
      );

      newTransactions += batchResult.newTransactions;
      updatedTransactions += batchResult.updatedTransactions;
      totalProcessed += response.transactions.length;

      // Update latest balance from most recent transaction
      if (response.transactions.length > 0) {
        const latestTransaction = response.transactions[0];
        if (latestTransaction.balance_after) {
          latestBalance = latestTransaction.balance_after;
        }
      }

      // Check if we've reached the end
      if (
        !response.pagination.has_more ||
        response.transactions.length < limit
      ) {
        break;
      }

      offset += limit;

      // Safety check to prevent infinite loops
      if (offset > 10000) {
        this.logger.warn(
          `Sync reached maximum offset (${offset}) for account ${account.id}`
        );
        break;
      }
    }

    return {
      newTransactions,
      updatedTransactions,
      totalProcessed,
      latestBalance,
    };
  }

  /**
   * Process a batch of transactions
   */
  private async processTransactionBatch(
    account: MobileMoneyAccount,
    transactions: AirtelTransactionDto[]
  ): Promise<{ newTransactions: number; updatedTransactions: number }> {
    let newTransactions = 0;
    let updatedTransactions = 0;

    const transactionsToCreate: CreateTransactionData[] = [];

    for (const airtelTx of transactions) {
      try {
        // Check if transaction already exists
        const existingTx = await this.transactionRepository.findByExternalId(
          account.organizationId,
          airtelTx.transaction_id
        );

        if (existingTx) {
          // Update existing transaction if needed
          const hasChanges = this.hasTransactionChanges(existingTx, airtelTx);
          if (hasChanges) {
            await this.updateExistingTransaction(existingTx.id, airtelTx);
            updatedTransactions++;
          }
        } else {
          // Prepare new transaction for batch creation
          const transactionData = this.mapAirtelTransactionToCreateData(
            account,
            airtelTx
          );
          transactionsToCreate.push(transactionData);
        }
      } catch (error: any) {
        this.logger.error(
          `[Sync] Failed to process transaction ${airtelTx.transaction_id}:`,
          error.stack
        );
      }
    }

    // Create new transactions in batch
    if (transactionsToCreate.length > 0) {
      const result =
        await this.transactionRepository.createMany(transactionsToCreate);
      newTransactions = result.count;
    }

    return { newTransactions, updatedTransactions };
  }

  /**
   * Map Airtel transaction to create data
   */
  private mapAirtelTransactionToCreateData(
    account: MobileMoneyAccount,
    airtelTx: AirtelTransactionDto
  ): CreateTransactionData {
    return {
      organizationId: account.organizationId,
      accountId: account.id,
      externalId: airtelTx.transaction_id,
      reference: airtelTx.reference,
      transactionDate: new Date(airtelTx.transaction_date),
      amount: airtelTx.amount,
      currency: airtelTx.currency,
      type: this.mapAirtelTransactionType(airtelTx.transaction_type),
      counterpartyName: airtelTx.counterparty?.name,
      counterpartyNumber: airtelTx.counterparty?.msisdn,
      description: airtelTx.description,
      balanceAfter: airtelTx.balance_after,
      status: this.mapAirtelTransactionStatus(airtelTx.status),
      fees: airtelTx.fees || 0,
      metadata: {
        provider: 'AIRTEL_MONEY',
        originalData: airtelTx,
      },
    };
  }

  /**
   * Map Airtel transaction type to internal type
   */
  private mapAirtelTransactionType(airtelType: string): TransactionType {
    switch (airtelType.toUpperCase()) {
      case 'DEPOSIT':
        return TransactionType.DEPOSIT;
      case 'WITHDRAWAL':
        return TransactionType.WITHDRAWAL;
      case 'PAYMENT':
        return TransactionType.PAYMENT;
      case 'TRANSFER':
        return TransactionType.TRANSFER;
      case 'FEE':
        return TransactionType.FEE;
      case 'REFUND':
        return TransactionType.REFUND;
      default:
        return TransactionType.OTHER;
    }
  }

  /**
   * Map Airtel transaction status to internal status
   */
  private mapAirtelTransactionStatus(airtelStatus: string): TransactionStatus {
    switch (airtelStatus.toUpperCase()) {
      case 'COMPLETED':
        return TransactionStatus.COMPLETED;
      case 'PENDING':
        return TransactionStatus.PENDING;
      case 'FAILED':
        return TransactionStatus.FAILED;
      case 'CANCELLED':
        return TransactionStatus.CANCELLED;
      case 'REVERSED':
        return TransactionStatus.REVERSED;
      default:
        return TransactionStatus.PENDING;
    }
  }

  /**
   * Check if transaction has changes that need updating
   */
  private hasTransactionChanges(
    existing: any,
    airtelTx: AirtelTransactionDto
  ): boolean {
    return (
      existing.status !== this.mapAirtelTransactionStatus(airtelTx.status) ||
      existing.description !== airtelTx.description ||
      existing.counterpartyName !== airtelTx.counterparty?.name ||
      (airtelTx.balance_after &&
        parseFloat(existing.balanceAfter?.toString() || '0') !==
          airtelTx.balance_after)
    );
  }

  /**
   * Update existing transaction
   */
  private async updateExistingTransaction(
    transactionId: string,
    airtelTx: AirtelTransactionDto
  ): Promise<void> {
    await this.transactionRepository.update(transactionId, {
      status: this.mapAirtelTransactionStatus(airtelTx.status),
      description: airtelTx.description,
      counterpartyName: airtelTx.counterparty?.name,
      counterpartyNumber: airtelTx.counterparty?.msisdn,
      balanceAfter: airtelTx.balance_after,
      fees: airtelTx.fees || 0,
      metadata: {
        provider: 'AIRTEL_MONEY',
        originalData: airtelTx,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Get account with validation
   */
  private async getAccountWithValidation(
    accountId: string
  ): Promise<MobileMoneyAccount | null> {
    const account = await this.prisma.mobileMoneyAccount.findUnique({
      where: { id: accountId },
    });

    if (
      !account ||
      !account.isLinked ||
      account.provider !== MobileMoneyProvider.AIRTEL_MONEY
    ) {
      return null;
    }

    return account;
  }

  /**
   * Determine sync date range
   */
  private async determineSyncDateRange(
    account: MobileMoneyAccount,
    options: SyncOptions
  ): Promise<{ startDate: Date; endDate: Date }> {
    const endDate = options.endDate || new Date();
    let startDate = options.startDate;

    if (!startDate && !options.forceFullSync) {
      // Get last sync date or last transaction date
      const lastSyncDate = account.lastSyncAt;
      const lastTransactionDate =
        await this.transactionRepository.getLatestTransactionDate(account.id);

      if (lastSyncDate) {
        startDate = lastSyncDate;
      } else if (lastTransactionDate) {
        startDate = lastTransactionDate;
      } else {
        // Default to 30 days ago for first sync
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }
    } else if (!startDate) {
      // Full sync - go back 90 days
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  /**
   * Refresh token if needed
   */
  private async refreshTokenIfNeeded(accountId: string): Promise<boolean> {
    try {
      const tokens = await this.tokenRepository.getTokens(accountId);
      if (!tokens?.refreshToken) {
        return false;
      }

      const newTokens = await this.airtelApiClient.refreshToken(
        tokens.refreshToken
      );
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      await this.tokenRepository.updateTokens(accountId, {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || tokens.refreshToken,
        expiresAt,
      });

      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to refresh token for account ${accountId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Create sync job record
   */
  private async createSyncJob(
    account: MobileMoneyAccount,
    options: SyncOptions
  ): Promise<SyncJob> {
    return await this.prisma.syncJob.create({
      data: {
        accountId: account.id,
        organizationId: account.organizationId,
        provider: account.provider,
        status: SyncJobStatus.RUNNING,
        isManual: options.isManual || false,
        startedAt: new Date(),
      },
    });
  }

  /**
   * Update sync job
   */
  private async updateSyncJob(
    syncJobId: string,
    data: {
      status: SyncJobStatus;
      transactionsProcessed?: number;
      newTransactions?: number;
      errorMessage?: string;
      completedAt: Date;
    }
  ): Promise<void> {
    await this.prisma.syncJob.update({
      where: { id: syncJobId },
      data,
    });
  }

  /**
   * Update account after successful sync
   */
  private async updateAccountAfterSync(
    account: MobileMoneyAccount,
    latestBalance: number | null
  ): Promise<void> {
    const updateData: any = {
      lastSyncAt: new Date(),
    };

    if (latestBalance !== null) {
      updateData.currentBalance = latestBalance;
      updateData.balanceUpdatedAt = new Date();
    }

    await this.prisma.mobileMoneyAccount.update({
      where: { id: account.id },
      data: updateData,
    });
  }
}
