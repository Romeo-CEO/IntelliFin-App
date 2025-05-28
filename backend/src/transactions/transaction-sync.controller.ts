import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

import { QueueService } from '../queue/queue.service';
import { TransactionSyncService } from './transaction-sync.service';
import { PrismaService } from '../database/prisma.service';

interface ManualSyncDto {
  accountIds?: string[];
  startDate?: string;
  endDate?: string;
  forceFullSync?: boolean;
}

interface SyncStatusResponse {
  accountId: string;
  accountName: string;
  isLinked: boolean;
  lastSyncAt: Date | null;
  currentBalance: number | null;
  syncStatus: 'idle' | 'syncing' | 'failed' | 'completed';
  lastSyncResult?: {
    success: boolean;
    newTransactions: number;
    totalProcessed: number;
    syncDuration: number;
    errors: string[];
  };
  activeJobs: number;
}

@ApiTags('Transaction Synchronization')
@Controller('transactions/sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionSyncController {
  constructor(
    private readonly queueService: QueueService,
    private readonly transactionSyncService: TransactionSyncService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('manual')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Trigger manual transaction sync',
    description: 'Manually trigger transaction synchronization for specific accounts or all accounts',
  })
  @ApiBody({
    description: 'Manual sync configuration',
    schema: {
      type: 'object',
      properties: {
        accountIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Specific account IDs to sync (optional - if not provided, syncs all accounts)',
        },
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date for sync range (optional)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date for sync range (optional)',
        },
        forceFullSync: {
          type: 'boolean',
          description: 'Force full sync instead of incremental (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sync jobs scheduled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        jobIds: { type: 'array', items: { type: 'string' } },
        accountsScheduled: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async triggerManualSync(
    @CurrentUser() user: AuthenticatedUser,
    @Body() syncDto: ManualSyncDto,
  ) {
    const jobIds: string[] = [];
    let accountsScheduled = 0;

    try {
      if (syncDto.accountIds && syncDto.accountIds.length > 0) {
        // Sync specific accounts
        for (const accountId of syncDto.accountIds) {
          // Verify account belongs to user's organization
          const account = await this.prisma.mobileMoneyAccount.findFirst({
            where: {
              id: accountId,
              organizationId: user.organizationId,
              isLinked: true,
            },
          });

          if (account) {
            const job = await this.queueService.addSyncAccountJob({
              accountId,
              organizationId: user.organizationId,
              startDate: syncDto.startDate ? new Date(syncDto.startDate) : undefined,
              endDate: syncDto.endDate ? new Date(syncDto.endDate) : undefined,
              isManual: true,
              userId: user.userId,
            });

            jobIds.push(job.id.toString());
            accountsScheduled++;
          }
        }
      } else {
        // Sync all accounts for the organization
        const job = await this.queueService.addSyncAllAccountsJob({
          organizationId: user.organizationId,
          isManual: true,
          userId: user.userId,
        });

        jobIds.push(job.id.toString());
        
        // Count linked accounts
        const accountCount = await this.prisma.mobileMoneyAccount.count({
          where: {
            organizationId: user.organizationId,
            isLinked: true,
          },
        });
        
        accountsScheduled = accountCount;
      }

      return {
        success: true,
        message: `Sync scheduled for ${accountsScheduled} account(s)`,
        jobIds,
        accountsScheduled,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to schedule sync',
        jobIds: [],
        accountsScheduled: 0,
      };
    }
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get sync status for all accounts',
    description: 'Retrieve synchronization status for all linked accounts in the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        accounts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              accountId: { type: 'string', format: 'uuid' },
              accountName: { type: 'string' },
              isLinked: { type: 'boolean' },
              lastSyncAt: { type: 'string', format: 'date-time', nullable: true },
              currentBalance: { type: 'number', nullable: true },
              syncStatus: { type: 'string', enum: ['idle', 'syncing', 'failed', 'completed'] },
              activeJobs: { type: 'number' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalAccounts: { type: 'number' },
            linkedAccounts: { type: 'number' },
            activeSyncs: { type: 'number' },
            lastGlobalSync: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
  })
  async getSyncStatus(@CurrentUser() user: AuthenticatedUser) {
    const accounts = await this.prisma.mobileMoneyAccount.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        syncJobs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    const accountStatuses: SyncStatusResponse[] = [];
    let totalActiveSyncs = 0;

    for (const account of accounts) {
      const activeJobs = await this.queueService.getActiveJobsForAccount(account.id);
      const activeJobCount = activeJobs.length;
      
      if (activeJobCount > 0) {
        totalActiveSyncs++;
      }

      const lastSyncJob = account.syncJobs[0];
      let syncStatus: 'idle' | 'syncing' | 'failed' | 'completed' = 'idle';

      if (activeJobCount > 0) {
        syncStatus = 'syncing';
      } else if (lastSyncJob) {
        syncStatus = lastSyncJob.status === 'COMPLETED' ? 'completed' : 'failed';
      }

      accountStatuses.push({
        accountId: account.id,
        accountName: account.accountName || account.accountNumber,
        isLinked: account.isLinked,
        lastSyncAt: account.lastSyncAt,
        currentBalance: account.currentBalance ? parseFloat(account.currentBalance.toString()) : null,
        syncStatus,
        lastSyncResult: lastSyncJob ? {
          success: lastSyncJob.status === 'COMPLETED',
          newTransactions: lastSyncJob.newTransactions || 0,
          totalProcessed: lastSyncJob.transactionsProcessed || 0,
          syncDuration: lastSyncJob.completedAt && lastSyncJob.startedAt 
            ? lastSyncJob.completedAt.getTime() - lastSyncJob.startedAt.getTime()
            : 0,
          errors: lastSyncJob.errorMessage ? [lastSyncJob.errorMessage] : [],
        } : undefined,
        activeJobs: activeJobCount,
      });
    }

    // Get last global sync time
    const lastGlobalSync = await this.prisma.syncJob.findFirst({
      where: {
        organizationId: user.organizationId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    return {
      accounts: accountStatuses,
      summary: {
        totalAccounts: accounts.length,
        linkedAccounts: accounts.filter(a => a.isLinked).length,
        activeSyncs: totalActiveSyncs,
        lastGlobalSync: lastGlobalSync?.completedAt || null,
      },
    };
  }

  @Get('status/:accountId')
  @ApiOperation({
    summary: 'Get sync status for specific account',
    description: 'Retrieve detailed synchronization status for a specific account',
  })
  @ApiParam({
    name: 'accountId',
    description: 'UUID of the mobile money account',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Account sync status retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found or access denied',
  })
  async getAccountSyncStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    const account = await this.prisma.mobileMoneyAccount.findFirst({
      where: {
        id: accountId,
        organizationId: user.organizationId,
      },
      include: {
        syncJobs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!account) {
      return {
        success: false,
        message: 'Account not found or access denied',
      };
    }

    const activeJobs = await this.queueService.getActiveJobsForAccount(accountId);

    return {
      account: {
        id: account.id,
        name: account.accountName || account.accountNumber,
        number: account.accountNumber,
        provider: account.provider,
        isLinked: account.isLinked,
        lastSyncAt: account.lastSyncAt,
        currentBalance: account.currentBalance ? parseFloat(account.currentBalance.toString()) : null,
        balanceUpdatedAt: account.balanceUpdatedAt,
      },
      syncStatus: {
        isActive: activeJobs.length > 0,
        activeJobs: activeJobs.length,
        recentJobs: account.syncJobs.map(job => ({
          id: job.id,
          status: job.status,
          isManual: job.isManual,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          transactionsProcessed: job.transactionsProcessed,
          newTransactions: job.newTransactions,
          errorMessage: job.errorMessage,
        })),
      },
    };
  }

  @Post('cancel/:accountId')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Cancel active sync jobs for account',
    description: 'Cancel all active and pending sync jobs for a specific account',
  })
  @ApiParam({
    name: 'accountId',
    description: 'UUID of the mobile money account',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync jobs cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found or access denied',
  })
  async cancelAccountSync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    // Verify account belongs to user's organization
    const account = await this.prisma.mobileMoneyAccount.findFirst({
      where: {
        id: accountId,
        organizationId: user.organizationId,
      },
    });

    if (!account) {
      return {
        success: false,
        message: 'Account not found or access denied',
      };
    }

    try {
      await this.queueService.cancelJobsForAccount(accountId);

      return {
        success: true,
        message: 'Sync jobs cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to cancel sync jobs',
      };
    }
  }

  @Get('queue/stats')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Retrieve statistics for all sync queues',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
  })
  async getQueueStats() {
    const stats = await this.queueService.getQueueStats();
    return {
      success: true,
      stats,
      timestamp: new Date(),
    };
  }
}
