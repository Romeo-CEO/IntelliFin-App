import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../database/prisma.service';
import { MobileMoneyProvider } from '@prisma/client';

@Injectable()
export class TransactionSchedulerService {
  private readonly logger = new Logger(TransactionSchedulerService.name);
  private readonly isSchedulerEnabled: boolean;

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.isSchedulerEnabled = this.configService.get<boolean>('SYNC_SCHEDULER_ENABLED', true);
    
    if (!this.isSchedulerEnabled) {
      this.logger.warn('Transaction sync scheduler is disabled');
    }
  }

  /**
   * Schedule regular transaction sync for all accounts
   * Runs every hour during business hours (8 AM - 8 PM)
   */
  @Cron('0 8-20 * * *', {
    name: 'hourly-transaction-sync',
    timeZone: 'Africa/Lusaka',
  })
  async scheduleHourlySync() {
    if (!this.isSchedulerEnabled) {
      return;
    }

    this.logger.log('Starting hourly transaction sync for all organizations');

    try {
      const organizations = await this.getActiveOrganizations();
      let totalAccountsScheduled = 0;

      for (const org of organizations) {
        const accountsScheduled = await this.scheduleOrganizationSync(org.id, false);
        totalAccountsScheduled += accountsScheduled;
      }

      this.logger.log(`Hourly sync scheduled for ${totalAccountsScheduled} accounts across ${organizations.length} organizations`);
    } catch (error) {
      this.logger.error('Failed to schedule hourly sync:', error);
    }
  }

  /**
   * Schedule comprehensive sync during off-peak hours
   * Runs at 2 AM daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'daily-comprehensive-sync',
    timeZone: 'Africa/Lusaka',
  })
  async scheduleDailyComprehensiveSync() {
    if (!this.isSchedulerEnabled) {
      return;
    }

    this.logger.log('Starting daily comprehensive sync for all organizations');

    try {
      // Schedule comprehensive sync for all organizations
      const job = await this.queueService.addSyncAllAccountsJob({
        isManual: false,
      }, {
        priority: 20, // Lower priority for scheduled jobs
      });

      this.logger.log(`Daily comprehensive sync scheduled (Job: ${job.id})`);
    } catch (error) {
      this.logger.error('Failed to schedule daily comprehensive sync:', error);
    }
  }

  /**
   * Schedule balance updates for all accounts
   * Runs every 30 minutes during business hours
   */
  @Cron('*/30 8-20 * * *', {
    name: 'balance-update-sync',
    timeZone: 'Africa/Lusaka',
  })
  async scheduleBalanceUpdates() {
    if (!this.isSchedulerEnabled) {
      return;
    }

    this.logger.log('Starting balance update sync for all accounts');

    try {
      const accounts = await this.getActiveAccounts();
      let balanceUpdatesScheduled = 0;

      for (const account of accounts) {
        try {
          await this.queueService.addUpdateBalanceJob({
            accountId: account.id,
            organizationId: account.organizationId,
          }, {
            priority: 10,
          });

          balanceUpdatesScheduled++;
        } catch (error) {
          this.logger.error(`Failed to schedule balance update for account ${account.id}:`, error);
        }
      }

      this.logger.log(`Balance updates scheduled for ${balanceUpdatesScheduled} accounts`);
    } catch (error) {
      this.logger.error('Failed to schedule balance updates:', error);
    }
  }

  /**
   * Schedule sync for accounts that haven't been synced recently
   * Runs every 4 hours
   */
  @Cron('0 */4 * * *', {
    name: 'stale-account-sync',
    timeZone: 'Africa/Lusaka',
  })
  async scheduleStaleAccountSync() {
    if (!this.isSchedulerEnabled) {
      return;
    }

    this.logger.log('Starting sync for stale accounts');

    try {
      const staleThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago
      
      const staleAccounts = await this.prisma.mobileMoneyAccount.findMany({
        where: {
          isLinked: true,
          provider: MobileMoneyProvider.AIRTEL_MONEY,
          OR: [
            { lastSyncAt: null },
            { lastSyncAt: { lt: staleThreshold } },
          ],
        },
        select: {
          id: true,
          organizationId: true,
          accountName: true,
          lastSyncAt: true,
        },
      });

      let staleAccountsScheduled = 0;

      for (const account of staleAccounts) {
        try {
          await this.queueService.addSyncAccountJob({
            accountId: account.id,
            organizationId: account.organizationId,
            isManual: false,
          }, {
            priority: 15, // Medium priority for stale accounts
          });

          staleAccountsScheduled++;
        } catch (error) {
          this.logger.error(`Failed to schedule sync for stale account ${account.id}:`, error);
        }
      }

      this.logger.log(`Sync scheduled for ${staleAccountsScheduled} stale accounts`);
    } catch (error) {
      this.logger.error('Failed to schedule stale account sync:', error);
    }
  }

  /**
   * Clean up old sync jobs and optimize queues
   * Runs daily at 3 AM
   */
  @Cron('0 3 * * *', {
    name: 'queue-maintenance',
    timeZone: 'Africa/Lusaka',
  })
  async performQueueMaintenance() {
    if (!this.isSchedulerEnabled) {
      return;
    }

    this.logger.log('Starting queue maintenance');

    try {
      // Clean up old sync jobs from database
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      const deletedJobs = await this.prisma.syncJob.deleteMany({
        where: {
          completedAt: {
            lt: cutoffDate,
          },
          status: {
            in: ['COMPLETED', 'FAILED'],
          },
        },
      });

      this.logger.log(`Cleaned up ${deletedJobs.count} old sync jobs from database`);

      // Queue cleanup is handled by QueueService.cleanupOldJobs()
      this.logger.log('Queue maintenance completed');
    } catch (error) {
      this.logger.error('Failed to perform queue maintenance:', error);
    }
  }

  /**
   * Schedule sync for a specific organization
   */
  async scheduleOrganizationSync(organizationId: string, isManual: boolean = false): Promise<number> {
    try {
      const accounts = await this.prisma.mobileMoneyAccount.findMany({
        where: {
          organizationId,
          isLinked: true,
          provider: MobileMoneyProvider.AIRTEL_MONEY,
        },
        select: {
          id: true,
          lastSyncAt: true,
        },
      });

      let accountsScheduled = 0;

      for (const account of accounts) {
        try {
          // Skip accounts that were synced very recently (within last 30 minutes)
          // unless this is a manual sync
          if (!isManual && account.lastSyncAt) {
            const timeSinceLastSync = Date.now() - account.lastSyncAt.getTime();
            if (timeSinceLastSync < 30 * 60 * 1000) { // 30 minutes
              continue;
            }
          }

          await this.queueService.addSyncAccountJob({
            accountId: account.id,
            organizationId,
            isManual,
          }, {
            priority: isManual ? 1 : 10,
          });

          accountsScheduled++;
        } catch (error) {
          this.logger.error(`Failed to schedule sync for account ${account.id}:`, error);
        }
      }

      return accountsScheduled;
    } catch (error) {
      this.logger.error(`Failed to schedule organization sync for ${organizationId}:`, error);
      return 0;
    }
  }

  /**
   * Get organizations with active accounts
   */
  private async getActiveOrganizations() {
    return await this.prisma.organization.findMany({
      where: {
        accounts: {
          some: {
            isLinked: true,
            provider: MobileMoneyProvider.AIRTEL_MONEY,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  /**
   * Get all active accounts
   */
  private async getActiveAccounts() {
    return await this.prisma.mobileMoneyAccount.findMany({
      where: {
        isLinked: true,
        provider: MobileMoneyProvider.AIRTEL_MONEY,
      },
      select: {
        id: true,
        organizationId: true,
        accountName: true,
        lastSyncAt: true,
        balanceUpdatedAt: true,
      },
    });
  }

  /**
   * Enable or disable the scheduler
   */
  setSchedulerEnabled(enabled: boolean) {
    // Note: This would require restarting the service to take effect
    // In a production environment, you might want to use a more dynamic approach
    this.logger.log(`Scheduler ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get scheduler status
   */
  getSchedulerStatus() {
    return {
      enabled: this.isSchedulerEnabled,
      timezone: 'Africa/Lusaka',
      scheduledJobs: [
        {
          name: 'hourly-transaction-sync',
          pattern: '0 8-20 * * *',
          description: 'Hourly sync during business hours',
        },
        {
          name: 'daily-comprehensive-sync',
          pattern: '0 2 * * *',
          description: 'Daily comprehensive sync at 2 AM',
        },
        {
          name: 'balance-update-sync',
          pattern: '*/30 8-20 * * *',
          description: 'Balance updates every 30 minutes',
        },
        {
          name: 'stale-account-sync',
          pattern: '0 */4 * * *',
          description: 'Sync stale accounts every 4 hours',
        },
        {
          name: 'queue-maintenance',
          pattern: '0 3 * * *',
          description: 'Queue maintenance at 3 AM',
        },
      ],
    };
  }
}
