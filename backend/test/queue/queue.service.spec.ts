import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Job, Queue } from 'bull';

import { QueueService, SyncAccountJobData, SyncAllAccountsJobData } from '../../src/queue/queue.service';
import { QUEUE_NAMES, JOB_TYPES } from '../../src/queue/queue.module';

describe('QueueService', () => {
  let service: QueueService;
  let transactionSyncQueue: jest.Mocked<Queue>;
  let balanceUpdateQueue: jest.Mocked<Queue>;
  let errorHandlingQueue: jest.Mocked<Queue>;
  let notificationQueue: jest.Mocked<Queue>;

  const mockJob = {
    id: 'job-1',
    data: { accountId: 'account-1', organizationId: 'org-1' },
    remove: jest.fn(),
  } as unknown as Job;

  beforeEach(async () => {
    const mockQueueMethods = {
      add: jest.fn(),
      getActive: jest.fn(),
      getWaiting: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      getDelayed: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      clean: jest.fn(),
      name: 'mock-queue',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken(QUEUE_NAMES.TRANSACTION_SYNC),
          useValue: mockQueueMethods,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.BALANCE_UPDATE),
          useValue: mockQueueMethods,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.ERROR_HANDLING),
          useValue: mockQueueMethods,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
          useValue: mockQueueMethods,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    transactionSyncQueue = module.get(getQueueToken(QUEUE_NAMES.TRANSACTION_SYNC));
    balanceUpdateQueue = module.get(getQueueToken(QUEUE_NAMES.BALANCE_UPDATE));
    errorHandlingQueue = module.get(getQueueToken(QUEUE_NAMES.ERROR_HANDLING));
    notificationQueue = module.get(getQueueToken(QUEUE_NAMES.NOTIFICATION));
  });

  describe('addSyncAccountJob', () => {
    it('should add sync account job with correct priority for manual sync', async () => {
      const jobData: SyncAccountJobData = {
        accountId: 'account-1',
        organizationId: 'org-1',
        isManual: true,
      };

      transactionSyncQueue.add.mockResolvedValue(mockJob);

      const result = await service.addSyncAccountJob(jobData);

      expect(transactionSyncQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.SYNC_ACCOUNT_TRANSACTIONS,
        jobData,
        expect.objectContaining({
          priority: 1, // High priority for manual sync
          delay: 0,
        })
      );
      expect(result).toBe(mockJob);
    });

    it('should add sync account job with lower priority for automatic sync', async () => {
      const jobData: SyncAccountJobData = {
        accountId: 'account-1',
        organizationId: 'org-1',
        isManual: false,
      };

      transactionSyncQueue.add.mockResolvedValue(mockJob);

      await service.addSyncAccountJob(jobData);

      expect(transactionSyncQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.SYNC_ACCOUNT_TRANSACTIONS,
        jobData,
        expect.objectContaining({
          priority: 10, // Lower priority for automatic sync
          delay: 1000,
        })
      );
    });

    it('should allow custom job options', async () => {
      const jobData: SyncAccountJobData = {
        accountId: 'account-1',
        organizationId: 'org-1',
      };

      const customOptions = {
        priority: 5,
        delay: 2000,
        attempts: 3,
      };

      transactionSyncQueue.add.mockResolvedValue(mockJob);

      await service.addSyncAccountJob(jobData, customOptions);

      expect(transactionSyncQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.SYNC_ACCOUNT_TRANSACTIONS,
        jobData,
        expect.objectContaining(customOptions)
      );
    });
  });

  describe('addSyncAllAccountsJob', () => {
    it('should add sync all accounts job', async () => {
      const jobData: SyncAllAccountsJobData = {
        organizationId: 'org-1',
        isManual: true,
      };

      transactionSyncQueue.add.mockResolvedValue(mockJob);

      const result = await service.addSyncAllAccountsJob(jobData);

      expect(transactionSyncQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.SYNC_ALL_ACCOUNTS,
        jobData,
        expect.objectContaining({
          priority: 1, // High priority for manual sync
          delay: 0,
        })
      );
      expect(result).toBe(mockJob);
    });
  });

  describe('addUpdateBalanceJob', () => {
    it('should add balance update job', async () => {
      const jobData = {
        accountId: 'account-1',
        organizationId: 'org-1',
      };

      balanceUpdateQueue.add.mockResolvedValue(mockJob);

      const result = await service.addUpdateBalanceJob(jobData);

      expect(balanceUpdateQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.UPDATE_ACCOUNT_BALANCE,
        jobData,
        expect.objectContaining({
          priority: 5,
        })
      );
      expect(result).toBe(mockJob);
    });
  });

  describe('addRetryFailedSyncJob', () => {
    it('should add retry job with exponential backoff delay', async () => {
      const jobData = {
        originalJobId: 'original-job-1',
        accountId: 'account-1',
        organizationId: 'org-1',
        retryCount: 2,
      };

      transactionSyncQueue.add.mockResolvedValue(mockJob);

      await service.addRetryFailedSyncJob(jobData);

      expect(transactionSyncQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.RETRY_FAILED_SYNC,
        jobData,
        expect.objectContaining({
          priority: 15,
          delay: expect.any(Number),
        })
      );

      // Verify delay calculation (should be exponential backoff)
      const callArgs = transactionSyncQueue.add.mock.calls[0][2];
      expect(callArgs.delay).toBeGreaterThan(5000); // Base delay is 5000ms
    });

    it('should calculate correct retry delay', async () => {
      const testCases = [
        { retryCount: 0, expectedMinDelay: 5000 },
        { retryCount: 1, expectedMinDelay: 10000 },
        { retryCount: 2, expectedMinDelay: 20000 },
        { retryCount: 5, expectedMinDelay: 160000 },
      ];

      for (const testCase of testCases) {
        const jobData = {
          originalJobId: 'original-job-1',
          accountId: 'account-1',
          organizationId: 'org-1',
          retryCount: testCase.retryCount,
        };

        transactionSyncQueue.add.mockClear();
        await service.addRetryFailedSyncJob(jobData);

        const callArgs = transactionSyncQueue.add.mock.calls[0][2];
        expect(callArgs.delay).toBeGreaterThanOrEqual(testCase.expectedMinDelay * 0.9); // Account for jitter
        expect(callArgs.delay).toBeLessThanOrEqual(Math.min(testCase.expectedMinDelay * 1.1, 300000)); // Max delay is 5 minutes
      }
    });
  });

  describe('addNotificationJob', () => {
    it('should add notification job', async () => {
      const jobData = {
        type: 'sync_completed' as const,
        accountId: 'account-1',
        organizationId: 'org-1',
        metadata: { result: 'success' },
      };

      notificationQueue.add.mockResolvedValue(mockJob);

      const result = await service.addNotificationJob(jobData);

      expect(notificationQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.SEND_SYNC_NOTIFICATION,
        jobData,
        expect.objectContaining({
          priority: 3,
        })
      );
      expect(result).toBe(mockJob);
    });
  });

  describe('getQueueStats', () => {
    it('should return statistics for all queues', async () => {
      const mockStats = {
        waiting: [mockJob],
        active: [],
        completed: [mockJob, mockJob],
        failed: [],
        delayed: [],
      };

      // Mock all queue methods
      [transactionSyncQueue, balanceUpdateQueue, errorHandlingQueue, notificationQueue].forEach(queue => {
        queue.getWaiting.mockResolvedValue(mockStats.waiting);
        queue.getActive.mockResolvedValue(mockStats.active);
        queue.getCompleted.mockResolvedValue(mockStats.completed);
        queue.getFailed.mockResolvedValue(mockStats.failed);
        queue.getDelayed.mockResolvedValue(mockStats.delayed);
      });

      const stats = await service.getQueueStats();

      expect(stats).toHaveProperty('transactionSync');
      expect(stats).toHaveProperty('balanceUpdate');
      expect(stats).toHaveProperty('errorHandling');
      expect(stats).toHaveProperty('notification');

      expect(stats.transactionSync).toEqual({
        name: 'mock-queue',
        waiting: 1,
        active: 0,
        completed: 2,
        failed: 0,
        delayed: 0,
        total: 3,
      });
    });
  });

  describe('getActiveJobsForAccount', () => {
    it('should return active jobs for specific account', async () => {
      const activeJobs = [
        { ...mockJob, data: { accountId: 'account-1', organizationId: 'org-1' } },
        { ...mockJob, data: { accountId: 'account-2', organizationId: 'org-1' } },
        { ...mockJob, data: { accountId: 'account-1', organizationId: 'org-2' } },
      ];

      transactionSyncQueue.getActive.mockResolvedValue(activeJobs as Job[]);

      const result = await service.getActiveJobsForAccount('account-1');

      expect(result).toHaveLength(2);
      expect(result.every(job => job.data.accountId === 'account-1')).toBe(true);
    });

    it('should handle jobs with accounts array', async () => {
      const activeJobs = [
        { ...mockJob, data: { accounts: ['account-1', 'account-2'], organizationId: 'org-1' } },
        { ...mockJob, data: { accounts: ['account-3'], organizationId: 'org-1' } },
      ];

      transactionSyncQueue.getActive.mockResolvedValue(activeJobs as Job[]);

      const result = await service.getActiveJobsForAccount('account-1');

      expect(result).toHaveLength(1);
      expect(result[0].data.accounts).toContain('account-1');
    });
  });

  describe('cancelJobsForAccount', () => {
    it('should cancel all jobs for specific account', async () => {
      const jobsToCancel = [
        { ...mockJob, data: { accountId: 'account-1' }, remove: jest.fn() },
        { ...mockJob, data: { accountId: 'account-1' }, remove: jest.fn() },
      ];

      const otherJobs = [
        { ...mockJob, data: { accountId: 'account-2' }, remove: jest.fn() },
      ];

      transactionSyncQueue.getActive.mockResolvedValue(jobsToCancel as Job[]);
      transactionSyncQueue.getWaiting.mockResolvedValue(otherJobs as Job[]);
      transactionSyncQueue.getDelayed.mockResolvedValue([]);

      await service.cancelJobsForAccount('account-1');

      expect(jobsToCancel[0].remove).toHaveBeenCalled();
      expect(jobsToCancel[1].remove).toHaveBeenCalled();
      expect(otherJobs[0].remove).not.toHaveBeenCalled();
    });
  });

  describe('pauseQueue and resumeQueue', () => {
    it('should pause and resume queues', async () => {
      await service.pauseQueue(QUEUE_NAMES.TRANSACTION_SYNC);
      expect(transactionSyncQueue.pause).toHaveBeenCalled();

      await service.resumeQueue(QUEUE_NAMES.TRANSACTION_SYNC);
      expect(transactionSyncQueue.resume).toHaveBeenCalled();
    });

    it('should handle invalid queue names gracefully', async () => {
      await expect(service.pauseQueue('invalid-queue')).resolves.not.toThrow();
      await expect(service.resumeQueue('invalid-queue')).resolves.not.toThrow();
    });
  });

  describe('cleanupOldJobs', () => {
    it('should clean up old jobs from all queues', async () => {
      const queues = [transactionSyncQueue, balanceUpdateQueue, errorHandlingQueue, notificationQueue];
      
      queues.forEach(queue => {
        queue.clean.mockResolvedValue(5); // Mock cleanup result
      });

      await service.cleanupOldJobs();

      queues.forEach(queue => {
        expect(queue.clean).toHaveBeenCalledWith(7 * 24 * 60 * 60 * 1000, 'completed');
        expect(queue.clean).toHaveBeenCalledWith(30 * 24 * 60 * 60 * 1000, 'failed');
        expect(queue.clean).toHaveBeenCalledWith(60 * 60 * 1000, 'active');
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      transactionSyncQueue.clean.mockRejectedValue(new Error('Cleanup failed'));

      await expect(service.cleanupOldJobs()).resolves.not.toThrow();
    });
  });
});
