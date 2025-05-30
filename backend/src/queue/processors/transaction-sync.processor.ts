import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { JOB_TYPES, QUEUE_NAMES } from '../queue.module';
import { TransactionSyncService } from '../../transactions/transaction-sync.service';
import { RetryStrategy } from '../strategies/retry.strategy';
import {
  QueueService,
  RetryFailedSyncJobData,
  SyncAccountJobData,
  SyncAllAccountsJobData,
  UpdateBalanceJobData,
} from '../queue.service';
import { PrismaService } from '../../database/prisma.service';
import { AirtelMoneyApiClient } from '../../integrations/airtel-money/airtel-money-api.client';
import { AirtelMoneyTokenRepository } from '../../integrations/airtel-money/airtel-money-token.repository';

@Processor(QUEUE_NAMES.TRANSACTION_SYNC)
export class TransactionSyncProcessor {
  private readonly logger = new Logger(TransactionSyncProcessor.name);

  constructor(
    private readonly transactionSyncService: TransactionSyncService,
    private readonly retryStrategy: RetryStrategy,
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly airtelApiClient: AirtelMoneyApiClient,
    private readonly tokenRepository: AirtelMoneyTokenRepository
  ) {}

  @Process(JOB_TYPES.SYNC_ACCOUNT_TRANSACTIONS)
  async processSyncAccountTransactions(job: Job<SyncAccountJobData>) {
    const { accountId, organizationId, startDate, endDate, isManual, userId } =
      job.data;

    this.logger.log(
      `Processing sync for account: ${accountId} (Job: ${job.id})`
    );

    try {
      // Add notification job for sync start
      await this.queueService.addNotificationJob({
        type: 'sync_started',
        accountId,
        organizationId,
        userId,
        metadata: { jobId: job.id, isManual },
      });

      const result = await this.transactionSyncService.syncAccountTransactions(
        accountId,
        {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          isManual,
        }
      );

      // Add notification job for sync completion
      await this.queueService.addNotificationJob({
        type: 'sync_completed',
        accountId,
        organizationId,
        userId,
        metadata: {
          jobId: job.id,
          result,
          isManual,
        },
      });

      // Schedule balance update if sync was successful
      if (result.success && result.newTransactions > 0) {
        await this.queueService.addUpdateBalanceJob({
          accountId,
          organizationId,
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Sync failed for account ${accountId}:`, error);

      // Add notification job for sync failure
      await this.queueService.addNotificationJob({
        type: 'sync_failed',
        accountId,
        organizationId,
        userId,
        metadata: {
          jobId: job.id,
          error: error.message,
          isManual,
        },
      });

      throw error;
    }
  }

  @Process(JOB_TYPES.SYNC_ALL_ACCOUNTS)
  async processSyncAllAccounts(job: Job<SyncAllAccountsJobData>) {
    const { organizationId } = job.data;

    this.logger.log(
      `Processing sync for all accounts in organization: ${organizationId || 'all'} (Job: ${job.id})`
    );

    try {
      let results;

      if (organizationId) {
        results =
          await this.transactionSyncService.syncAllAccountsForOrganization(
            organizationId
          );
      } else {
        // Sync all accounts across all organizations
        results = await this.syncAllAccountsGlobally();
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      this.logger.log(
        `Completed sync for all accounts: ${successCount} successful, ${failureCount} failed`
      );

      return {
        totalAccounts: results.length,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      this.logger.error('Failed to sync all accounts:', error);
      throw error;
    }
  }

  @Process(JOB_TYPES.UPDATE_ACCOUNT_BALANCE)
  async processUpdateAccountBalance(job: Job<UpdateBalanceJobData>) {
    const { accountId, organizationId } = job.data;

    this.logger.log(
      `Processing balance update for account: ${accountId} (Job: ${job.id})`
    );

    try {
      // Get account and tokens
      const account = await this.prisma.mobileMoneyAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || !account.isLinked) {
        throw new Error(`Account ${accountId} not found or not linked`);
      }

      const tokens = await this.tokenRepository.getTokens(accountId);
      if (!tokens) {
        throw new Error('No valid tokens found for account');
      }

      // Get current balance from Airtel
      const balanceInfo = await this.airtelApiClient.getAccountBalance(
        tokens.accessToken
      );

      // Update account balance
      await this.prisma.mobileMoneyAccount.update({
        where: { id: accountId },
        data: {
          currentBalance: balanceInfo.balance,
          balanceUpdatedAt: new Date(),
        },
      });

      this.logger.log(
        `Updated balance for account ${accountId}: ${balanceInfo.balance} ${balanceInfo.currency}`
      );

      return {
        accountId,
        balance: balanceInfo.balance,
        currency: balanceInfo.currency,
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to update balance for account ${accountId}:`,
        error
      );
      throw error;
    }
  }

  @Process(JOB_TYPES.RETRY_FAILED_SYNC)
  async processRetryFailedSync(job: Job<RetryFailedSyncJobData>) {
    const { originalJobId, accountId, organizationId, retryCount } = job.data;

    this.logger.log(
      `Processing retry for failed sync: ${originalJobId}, attempt: ${retryCount} (Job: ${job.id})`
    );

    try {
      // Add a new sync job with higher priority
      await this.queueService.addSyncAccountJob(
        {
          accountId,
          organizationId,
          isManual: false,
        },
        {
          priority: 1, // High priority for retries
        }
      );

      return {
        originalJobId,
        accountId,
        retryCount,
        newJobScheduled: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to schedule retry for job ${originalJobId}:`,
        error
      );
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} (${job.name}) started processing`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} (${job.name}) completed successfully`);

    // Log detailed results for sync jobs
    if (job.name === JOB_TYPES.SYNC_ACCOUNT_TRANSACTIONS && result) {
      this.logger.log(
        `Sync results for account ${job.data.accountId}: ` +
          `${result.newTransactions} new, ${result.updatedTransactions} updated, ` +
          `${result.totalProcessed} processed in ${result.syncDuration}ms`
      );
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} (${job.name}) failed:`, error);

    // Determine if job should be retried
    const retryConfig = this.retryStrategy.getConfigForJobType(job.name);
    const retryDecision = this.retryStrategy.shouldRetryJob(
      job,
      error,
      retryConfig
    );

    this.retryStrategy.logRetryDecision(job, error, retryDecision);

    // Handle specific retry logic for sync jobs
    if (
      job.name === JOB_TYPES.SYNC_ACCOUNT_TRANSACTIONS &&
      !retryDecision.shouldRetry
    ) {
      // Schedule a retry job with exponential backoff
      const retryCount = (job.data.retryCount || 0) + 1;

      if (retryCount <= 3) {
        await this.queueService.addRetryFailedSyncJob({
          originalJobId: job.id.toString(),
          accountId: job.data.accountId,
          organizationId: job.data.organizationId,
          retryCount,
        });
      } else {
        this.logger.error(
          `Maximum retry attempts reached for account ${job.data.accountId}. Manual intervention required.`
        );
      }
    }
  }

  /**
   * Sync all accounts across all organizations
   */
  private async syncAllAccountsGlobally() {
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    const allResults = [];

    for (const org of organizations) {
      try {
        const results =
          await this.transactionSyncService.syncAllAccountsForOrganization(
            org.id
          );
        allResults.push(...results);
      } catch (error) {
        this.logger.error(
          `Failed to sync accounts for organization ${org.id}:`,
          error
        );
      }
    }

    return allResults;
  }
}
