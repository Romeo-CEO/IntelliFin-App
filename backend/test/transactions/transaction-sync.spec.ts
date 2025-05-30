import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';

import { TransactionSyncService } from '../../src/transactions/transaction-sync.service';
import { TransactionRepository } from '../../src/transactions/transaction.repository';
import { AirtelMoneyApiClient } from '../../src/integrations/airtel-money/airtel-money-api.client';
import { AirtelMoneyTokenRepository } from '../../src/integrations/airtel-money/airtel-money-token.repository';
import { QueueService } from '../../src/queue/queue.service';
import { RetryStrategy } from '../../src/queue/strategies/retry.strategy';
import { PrismaService } from '../../src/database/prisma.service';
import { QUEUE_NAMES } from '../../src/queue/queue.module';

import {
  MobileMoneyProvider,
  SyncStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

describe('Transaction Sync Service', () => {
  let service: TransactionSyncService;
  let transactionRepository: TransactionRepository;
  let airtelApiClient: AirtelMoneyApiClient;
  let tokenRepository: AirtelMoneyTokenRepository;
  let prismaService: PrismaService;

  const mockAccount = {
    id: 'account-1',
    organizationId: 'org-1',
    provider: MobileMoneyProvider.AIRTEL_MONEY,
    accountNumber: '+260971234567',
    accountName: 'Test Account',
    isLinked: true,
    lastSyncAt: new Date('2023-12-01T10:00:00Z'),
    currentBalance: 1000,
    currency: 'ZMW',
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  };

  const mockAirtelTransactions = [
    {
      transaction_id: 'TXN001',
      reference: 'REF001',
      transaction_date: '2023-12-01T12:00:00Z',
      amount: 100,
      currency: 'ZMW',
      transaction_type: 'PAYMENT',
      status: 'COMPLETED',
      description: 'Test payment',
      counterparty: {
        name: 'Test Merchant',
        msisdn: '+260977654321',
      },
      balance_after: 900,
      fees: 5,
    },
    {
      transaction_id: 'TXN002',
      reference: 'REF002',
      transaction_date: '2023-12-01T13:00:00Z',
      amount: 200,
      currency: 'ZMW',
      transaction_type: 'DEPOSIT',
      status: 'COMPLETED',
      description: 'Test deposit',
      balance_after: 1100,
      fees: 0,
    },
  ];

  const mockAirtelResponse = {
    transactions: mockAirtelTransactions,
    pagination: {
      total: 2,
      limit: 50,
      offset: 0,
      has_more: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionSyncService,
        {
          provide: TransactionRepository,
          useValue: {
            findByExternalId: jest.fn(),
            createMany: jest.fn(),
            update: jest.fn(),
            getLatestTransactionDate: jest.fn(),
          },
        },
        {
          provide: AirtelMoneyApiClient,
          useValue: {
            getTransactions: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
        {
          provide: AirtelMoneyTokenRepository,
          useValue: {
            getTokens: jest.fn(),
            areTokensExpired: jest.fn(),
            updateTokens: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            mobileMoneyAccount: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            syncJob: {
              create: jest.fn(),
              update: jest.fn(),
            },
            organization: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TransactionSyncService>(TransactionSyncService);
    transactionRepository = module.get<TransactionRepository>(
      TransactionRepository
    );
    airtelApiClient = module.get<AirtelMoneyApiClient>(AirtelMoneyApiClient);
    tokenRepository = module.get<AirtelMoneyTokenRepository>(
      AirtelMoneyTokenRepository
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('syncAccountTransactions', () => {
    beforeEach(() => {
      jest
        .spyOn(prismaService.mobileMoneyAccount, 'findUnique')
        .mockResolvedValue(mockAccount as any);
      jest.spyOn(tokenRepository, 'getTokens').mockResolvedValue(mockTokens);
      jest.spyOn(tokenRepository, 'areTokensExpired').mockResolvedValue(false);
      jest
        .spyOn(airtelApiClient, 'getTransactions')
        .mockResolvedValue(mockAirtelResponse as any);
      jest
        .spyOn(transactionRepository, 'findByExternalId')
        .mockResolvedValue(null);
      jest
        .spyOn(transactionRepository, 'createMany')
        .mockResolvedValue({ count: 2 });
      jest
        .spyOn(transactionRepository, 'getLatestTransactionDate')
        .mockResolvedValue(new Date('2023-11-30T10:00:00Z'));
      jest.spyOn(prismaService.syncJob, 'create').mockResolvedValue({
        id: 'sync-job-1',
        status: SyncStatus.RUNNING,
      } as any);
      jest.spyOn(prismaService.syncJob, 'update').mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.mobileMoneyAccount, 'update')
        .mockResolvedValue({} as any);
    });

    it('should successfully sync new transactions', async () => {
      const result = await service.syncAccountTransactions('account-1');

      expect(result.success).toBe(true);
      expect(result.newTransactions).toBe(2);
      expect(result.totalProcessed).toBe(2);
      expect(result.errors).toHaveLength(0);

      expect(airtelApiClient.getTransactions).toHaveBeenCalledWith(
        mockTokens.accessToken,
        expect.objectContaining({
          limit: 100,
          offset: 0,
        })
      );

      expect(transactionRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            externalId: 'TXN001',
            amount: 100,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
          }),
          expect.objectContaining({
            externalId: 'TXN002',
            amount: 200,
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.COMPLETED,
          }),
        ])
      );
    });

    it('should handle existing transactions by updating them', async () => {
      const existingTransaction = {
        id: 'existing-tx-1',
        externalId: 'TXN001',
        status: TransactionStatus.PENDING,
        description: 'Old description',
      };

      jest
        .spyOn(transactionRepository, 'findByExternalId')
        .mockResolvedValueOnce(existingTransaction as any)
        .mockResolvedValueOnce(null);

      jest.spyOn(transactionRepository, 'update').mockResolvedValue({} as any);

      const result = await service.syncAccountTransactions('account-1');

      expect(result.success).toBe(true);
      expect(result.newTransactions).toBe(1); // Only TXN002 is new
      expect(result.updatedTransactions).toBe(1); // TXN001 was updated

      expect(transactionRepository.update).toHaveBeenCalledWith(
        'existing-tx-1',
        expect.objectContaining({
          status: TransactionStatus.COMPLETED,
          description: 'Test payment',
        })
      );
    });

    it('should refresh expired tokens', async () => {
      jest.spyOn(tokenRepository, 'areTokensExpired').mockResolvedValue(true);
      jest.spyOn(airtelApiClient, 'refreshToken').mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'profile transactions balance',
      });

      const result = await service.syncAccountTransactions('account-1');

      expect(result.success).toBe(true);
      expect(airtelApiClient.refreshToken).toHaveBeenCalledWith(
        mockTokens.refreshToken
      );
      expect(tokenRepository.updateTokens).toHaveBeenCalledWith(
        'account-1',
        expect.objectContaining({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const firstPageResponse = {
        transactions: [mockAirtelTransactions[0]],
        pagination: {
          total: 2,
          limit: 1,
          offset: 0,
          has_more: true,
        },
      };

      const secondPageResponse = {
        transactions: [mockAirtelTransactions[1]],
        pagination: {
          total: 2,
          limit: 1,
          offset: 1,
          has_more: false,
        },
      };

      jest
        .spyOn(airtelApiClient, 'getTransactions')
        .mockResolvedValueOnce(firstPageResponse as any)
        .mockResolvedValueOnce(secondPageResponse as any);

      const result = await service.syncAccountTransactions('account-1', {
        limit: 1,
      });

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(2);
      expect(airtelApiClient.getTransactions).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully', async () => {
      jest
        .spyOn(airtelApiClient, 'getTransactions')
        .mockRejectedValue(new Error('API Error'));

      const result = await service.syncAccountTransactions('account-1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('API Error');
      expect(result.newTransactions).toBe(0);
    });

    it('should handle token refresh failures', async () => {
      jest.spyOn(tokenRepository, 'areTokensExpired').mockResolvedValue(true);
      jest
        .spyOn(airtelApiClient, 'refreshToken')
        .mockRejectedValue(new Error('Token refresh failed'));

      await expect(
        service.syncAccountTransactions('account-1')
      ).rejects.toThrow('Failed to refresh expired token');
    });

    it('should handle missing account', async () => {
      jest
        .spyOn(prismaService.mobileMoneyAccount, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.syncAccountTransactions('invalid-account')
      ).rejects.toThrow('Account invalid-account not found or not linked');
    });

    it('should handle missing tokens', async () => {
      jest.spyOn(tokenRepository, 'getTokens').mockResolvedValue(null);

      await expect(
        service.syncAccountTransactions('account-1')
      ).rejects.toThrow('No valid tokens found for account');
    });
  });

  describe('syncAllAccountsForOrganization', () => {
    beforeEach(() => {
      jest
        .spyOn(prismaService.mobileMoneyAccount, 'findMany')
        .mockResolvedValue([
          { ...mockAccount, id: 'account-1' },
          { ...mockAccount, id: 'account-2' },
        ] as any);
    });

    it('should sync all accounts in organization', async () => {
      jest.spyOn(service, 'syncAccountTransactions').mockResolvedValue({
        accountId: 'account-1',
        success: true,
        newTransactions: 2,
        updatedTransactions: 0,
        totalProcessed: 2,
        errors: [],
        syncDuration: 1000,
        lastSyncDate: new Date(),
      });

      const results = await service.syncAllAccountsForOrganization('org-1');

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(service.syncAccountTransactions).toHaveBeenCalledTimes(2);
    });

    it('should handle individual account failures', async () => {
      jest
        .spyOn(service, 'syncAccountTransactions')
        .mockResolvedValueOnce({
          accountId: 'account-1',
          success: true,
          newTransactions: 2,
          updatedTransactions: 0,
          totalProcessed: 2,
          errors: [],
          syncDuration: 1000,
          lastSyncDate: new Date(),
        })
        .mockRejectedValueOnce(new Error('Sync failed'));

      const results = await service.syncAllAccountsForOrganization('org-1');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].errors).toContain('Sync failed');
    });
  });

  describe('transaction mapping', () => {
    it('should correctly map Airtel transaction types', async () => {
      const testCases = [
        { airtelType: 'DEPOSIT', expectedType: TransactionType.DEPOSIT },
        { airtelType: 'WITHDRAWAL', expectedType: TransactionType.WITHDRAWAL },
        { airtelType: 'PAYMENT', expectedType: TransactionType.PAYMENT },
        { airtelType: 'TRANSFER', expectedType: TransactionType.TRANSFER },
        { airtelType: 'FEE', expectedType: TransactionType.FEE },
        { airtelType: 'REFUND', expectedType: TransactionType.REFUND },
        { airtelType: 'UNKNOWN', expectedType: TransactionType.OTHER },
      ];

      for (const testCase of testCases) {
        const airtelTx = {
          ...mockAirtelTransactions[0],
          transaction_type: testCase.airtelType,
        };

        jest.spyOn(airtelApiClient, 'getTransactions').mockResolvedValue({
          transactions: [airtelTx],
          pagination: { total: 1, limit: 50, offset: 0, has_more: false },
        } as any);

        await service.syncAccountTransactions('account-1');

        expect(transactionRepository.createMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              type: testCase.expectedType,
            }),
          ])
        );
      }
    });

    it('should correctly map Airtel transaction statuses', async () => {
      const testCases = [
        {
          airtelStatus: 'COMPLETED',
          expectedStatus: TransactionStatus.COMPLETED,
        },
        { airtelStatus: 'PENDING', expectedStatus: TransactionStatus.PENDING },
        { airtelStatus: 'FAILED', expectedStatus: TransactionStatus.FAILED },
        {
          airtelStatus: 'CANCELLED',
          expectedStatus: TransactionStatus.CANCELLED,
        },
        {
          airtelStatus: 'REVERSED',
          expectedStatus: TransactionStatus.REVERSED,
        },
        { airtelStatus: 'UNKNOWN', expectedStatus: TransactionStatus.PENDING },
      ];

      for (const testCase of testCases) {
        const airtelTx = {
          ...mockAirtelTransactions[0],
          status: testCase.airtelStatus,
        };

        jest.spyOn(airtelApiClient, 'getTransactions').mockResolvedValue({
          transactions: [airtelTx],
          pagination: { total: 1, limit: 50, offset: 0, has_more: false },
        } as any);

        await service.syncAccountTransactions('account-1');

        expect(transactionRepository.createMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              status: testCase.expectedStatus,
            }),
          ])
        );
      }
    });
  });
});
