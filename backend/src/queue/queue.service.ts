import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobOptions } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';

import { QUEUE_NAMES, JOB_TYPES } from './queue.module';

export interface SyncAccountJobData {
  accountId: string;
  organizationId: string;
  startDate?: Date;
  endDate?: Date;
  isManual?: boolean;
  userId?: string;
}

export interface SyncAllAccountsJobData {
  organizationId?: string;
  isManual?: boolean;
  userId?: string;
}

export interface UpdateBalanceJobData {
  accountId: string;
  organizationId: string;
}

export interface RetryFailedSyncJobData {
  originalJobId: string;
  accountId: string;
  organizationId: string;
  retryCount: number;
}

export interface NotificationJobData {
  type: 'sync_completed' | 'sync_failed' | 'sync_started';
  accountId: string;
  organizationId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.TRANSACTION_SYNC)
    private readonly transactionSyncQueue: Queue,
    
    @InjectQueue(QUEUE_NAMES.BALANCE_UPDATE)
    private readonly balanceUpdateQueue: Queue,
    
    @InjectQueue(QUEUE_NAMES.ERROR_HANDLING)
    private readonly errorHandlingQueue: Queue,
    
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,
  ) {}

  /**
   * Add a job to sync transactions for a specific account
   */
  async addSyncAccountJob(
    data: SyncAccountJobData,
    options?: JobOptions,
  ): Promise<Job<SyncAccountJobData>> {
    const jobOptions: JobOptions = {
      priority: data.isManual ? 1 : 10, // Manual syncs get higher priority
      delay: data.isManual ? 0 : 1000, // Immediate for manual, slight delay for automatic
      ...options,
    };

    this.logger.debug(`Adding sync job for account: ${data.accountId}`);

    return await this.transactionSyncQueue.add(
      JOB_TYPES.SYNC_ACCOUNT_TRANSACTIONS,
      data,
      jobOptions,
    );
  }

  /**
   * Add a job to sync all accounts for an organization
   */
  async addSyncAllAccountsJob(
    data: SyncAllAccountsJobData,
    options?: JobOptions,
  ): Promise<Job<SyncAllAccountsJobData>> {
    const jobOptions: JobOptions = {
      priority: data.isManual ? 1 : 20,
      delay: data.isManual ? 0 : 2000,
      ...options,
    };

    this.logger.debug(`Adding sync all accounts job for organization: ${data.organizationId || 'all'}`);

    return await this.transactionSyncQueue.add(
      JOB_TYPES.SYNC_ALL_ACCOUNTS,
      data,
      jobOptions,
    );
  }

  /**
   * Add a job to update account balance
   */
  async addUpdateBalanceJob(
    data: UpdateBalanceJobData,
    options?: JobOptions,
  ): Promise<Job<UpdateBalanceJobData>> {
    const jobOptions: JobOptions = {
      priority: 5,
      ...options,
    };

    this.logger.debug(`Adding balance update job for account: ${data.accountId}`);

    return await this.balanceUpdateQueue.add(
      JOB_TYPES.UPDATE_ACCOUNT_BALANCE,
      data,
      jobOptions,
    );
  }

  /**
   * Add a job to retry a failed sync
   */
  async addRetryFailedSyncJob(
    data: RetryFailedSyncJobData,
    options?: JobOptions,
  ): Promise<Job<RetryFailedSyncJobData>> {
    const delay = this.calculateRetryDelay(data.retryCount);
    const jobOptions: JobOptions = {
      priority: 15,
      delay,
      ...options,
    };

    this.logger.debug(`Adding retry job for account: ${data.accountId}, attempt: ${data.retryCount}`);

    return await this.transactionSyncQueue.add(
      JOB_TYPES.RETRY_FAILED_SYNC,
      data,
      jobOptions,
    );
  }

  /**
   * Add a notification job
   */
  async addNotificationJob(
    data: NotificationJobData,
    options?: JobOptions,
  ): Promise<Job<NotificationJobData>> {
    const jobOptions: JobOptions = {
      priority: 3,
      ...options,
    };

    this.logger.debug(`Adding notification job: ${data.type} for account: ${data.accountId}`);

    return await this.notificationQueue.add(
      JOB_TYPES.SEND_SYNC_NOTIFICATION,
      data,
      jobOptions,
    );
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [
      transactionSyncStats,
      balanceUpdateStats,
      errorHandlingStats,
      notificationStats,
    ] = await Promise.all([
      this.getQueueStatistics(this.transactionSyncQueue),
      this.getQueueStatistics(this.balanceUpdateQueue),
      this.getQueueStatistics(this.errorHandlingQueue),
      this.getQueueStatistics(this.notificationQueue),
    ]);

    return {
      transactionSync: transactionSyncStats,
      balanceUpdate: balanceUpdateStats,
      errorHandling: errorHandlingStats,
      notification: notificationStats,
    };
  }

  /**
   * Get active jobs for a specific account
   */
  async getActiveJobsForAccount(accountId: string): Promise<Job[]> {
    const activeJobs = await this.transactionSyncQueue.getActive();
    return activeJobs.filter(job => 
      job.data.accountId === accountId || 
      (job.data.accounts && job.data.accounts.includes(accountId))
    );
  }

  /**
   * Cancel all jobs for a specific account
   */
  async cancelJobsForAccount(accountId: string): Promise<void> {
    const activeJobs = await this.getActiveJobsForAccount(accountId);
    const waitingJobs = await this.transactionSyncQueue.getWaiting();
    const delayedJobs = await this.transactionSyncQueue.getDelayed();

    const allJobs = [
      ...activeJobs,
      ...waitingJobs.filter(job => job.data.accountId === accountId),
      ...delayedJobs.filter(job => job.data.accountId === accountId),
    ];

    await Promise.all(allJobs.map(job => job.remove()));
    
    this.logger.debug(`Cancelled ${allJobs.length} jobs for account: ${accountId}`);
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.pause();
      this.logger.warn(`Paused queue: ${queueName}`);
    }
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    if (queue) {
      await queue.resume();
      this.logger.log(`Resumed queue: ${queueName}`);
    }
  }

  /**
   * Clean up old completed and failed jobs
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldJobs(): Promise<void> {
    this.logger.log('Starting cleanup of old jobs');

    const queues = [
      this.transactionSyncQueue,
      this.balanceUpdateQueue,
      this.errorHandlingQueue,
      this.notificationQueue,
    ];

    for (const queue of queues) {
      try {
        // Clean completed jobs older than 7 days
        await queue.clean(7 * 24 * 60 * 60 * 1000, 'completed');
        
        // Clean failed jobs older than 30 days
        await queue.clean(30 * 24 * 60 * 60 * 1000, 'failed');
        
        // Clean active jobs older than 1 hour (likely stalled)
        await queue.clean(60 * 60 * 1000, 'active');
        
        this.logger.debug(`Cleaned up old jobs for queue: ${queue.name}`);
      } catch (error) {
        this.logger.error(`Failed to clean up queue ${queue.name}:`, error);
      }
    }

    this.logger.log('Completed cleanup of old jobs');
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 5000; // 5 seconds
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Get statistics for a specific queue
   */
  private async getQueueStatistics(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      name: queue.name,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length,
    };
  }

  /**
   * Get queue instance by name
   */
  private getQueueByName(queueName: string): Queue | null {
    switch (queueName) {
      case QUEUE_NAMES.TRANSACTION_SYNC:
        return this.transactionSyncQueue;
      case QUEUE_NAMES.BALANCE_UPDATE:
        return this.balanceUpdateQueue;
      case QUEUE_NAMES.ERROR_HANDLING:
        return this.errorHandlingQueue;
      case QUEUE_NAMES.NOTIFICATION:
        return this.notificationQueue;
      default:
        return null;
    }
  }
}
