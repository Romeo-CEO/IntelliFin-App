import { Test, TestingModule } from '@nestjs/testing';
import { MockProxy, mockDeep } from 'jest-mock-extended';
import {
  CategorizationConfidence,
  Transaction,
  TransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CategorizationRuleRepository } from '../../src/categories/categorization-rule.repository';
import { TransactionCategorizationService } from '../../src/categories/transaction-categorization.service';
import { PrismaService } from '../../src/database/prisma.service';

// Extend the repository to include mock methods
interface MockCategorizationRuleRepository
  extends CategorizationRuleRepository {
  findMatchingRules: jest.Mock<Promise<any>, [Transaction]>;
  updateRuleStats: jest.Mock<Promise<void>, [string]>;
}

// Helper function to create a mock transaction
const createMockTransaction = (
  overrides: Partial<Transaction> = {}
): Transaction => ({
  id: 'tx-123',
  organizationId: 'org-123',
  accountId: 'acc-123',
  externalId: 'ext-123',
  reference: 'Test Reference',
  transactionDate: new Date(),
  amount: new Decimal('100.50'),
  balanceAfter: new Decimal('500.00'),
  description: 'Test transaction',
  type: 'WITHDRAWAL' as TransactionType,
  status: 'COMPLETED',
  currency: 'ZMW',
  counterpartyName: 'Test Merchant',
  counterpartyNumber: '260971234567',
  fees: new Decimal('0.50'),
  categoryId: null,
  isReconciled: false,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  invoiceId: null,
  expenseId: null,
  ...overrides,
});

// Helper function to create a mock rule for testing
const createMockRule = (overrides: any = {}) => ({
  id: 'rule-1',
  name: 'Test Rule',
  organizationId: 'org-123',
  categoryId: 'category-1',
  type: 'MANUAL',
  conditions: {
    descriptionPatterns: ['Test'],
  },
  confidence: CategorizationConfidence.HIGH,
  priority: 1,
  isActive: true,
  matchCount: 0,
  lastMatchedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {},
  category: {
    id: 'category-1',
    name: 'Test Category',
    type: 'EXPENSE',
    color: '#FF0000',
    organizationId: 'org-123',
    parentId: null,
    chartOfAccountsCode: '5000',
    isSystem: false,
    description: 'Test category',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  matchesTransaction: (tx: Transaction) => {
    return tx.description?.includes('Test') || false;
  },
  ...overrides,
});

describe('TransactionCategorizationService', () => {
  let service: TransactionCategorizationService;
  let ruleRepository: MockProxy<MockCategorizationRuleRepository>;

  beforeEach(async () => {
    const mockRepo = mockDeep<MockCategorizationRuleRepository>();

    // Setup default mock implementations
    mockRepo.findMatchingRules.mockResolvedValue([]);
    mockRepo.updateRuleStats.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionCategorizationService,
        {
          provide: CategorizationRuleRepository,
          useValue: mockRepo,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TransactionCategorizationService>(
      TransactionCategorizationService
    );
    ruleRepository =
      mockRepo as unknown as MockProxy<MockCategorizationRuleRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('categorizeTransaction', () => {
    it('should categorize transaction based on matching rules', async () => {
      // Arrange
      const transaction = createMockTransaction({
        description: 'Test transaction with keyword',
      });
      const mockRule = createMockRule();

      // Mock the repository to return our test rule
      ruleRepository.findMatchingRules.mockResolvedValue([
        {
          ...mockRule,
          matchesTransaction: (tx: Transaction) =>
            tx.description?.includes('keyword') || false,
        },
      ]);

      // Act
      const result = await (service as any).categorizeTransaction(transaction);

      // Assert
      expect(result).toBeDefined();
      expect(ruleRepository.findMatchingRules).toHaveBeenCalledWith(
        transaction
      );
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].ruleId).toBe(mockRule.id);
      expect(result.suggestions[0].categoryId).toBe(mockRule.categoryId);
    });

    it('should handle transactions with no matching rules', async () => {
      // Arrange
      const transaction = createMockTransaction({
        description: 'Transaction with no matching rules',
      });

      // Mock the repository to return no matching rules
      ruleRepository.findMatchingRules.mockResolvedValue([]);

      // Act
      const result = await (service as any).categorizeTransaction(transaction);

      // Assert
      expect(result).toBeDefined();
      expect(result.suggestions).toHaveLength(0);
      expect(ruleRepository.findMatchingRules).toHaveBeenCalledWith(
        transaction
      );
    });
  });

  describe('updateRuleStats', () => {
    it('should update rule statistics', async () => {
      // Arrange
      const ruleId = 'rule-1';
      ruleRepository.updateRuleStats.mockResolvedValue(undefined);

      // Act
      await (service as any).updateRuleStats(ruleId);

      // Assert
      expect(ruleRepository.updateRuleStats).toHaveBeenCalledWith(ruleId);
    });
  });

  describe('applyCategory', () => {
    it('should update the category of a transaction', async () => {
      // Arrange
      const transactionId = 'tx-123';
      const categoryId = 'category-1';
      const organizationId = 'org-123';

      const updatedTransaction = {
        ...createMockTransaction({ id: transactionId, organizationId }),
        categoryId,
        updatedAt: new Date(),
        category: {
          id: categoryId,
          name: 'Test Category',
          type: 'EXPENSE',
          color: '#000000',
        },
      };

      // Mock the Prisma client
      const mockPrisma = {
        transaction: {
          update: jest.fn().mockResolvedValue(updatedTransaction),
        },
      };

      // Replace the Prisma service with our mock
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TransactionCategorizationService,
          {
            provide: CategorizationRuleRepository,
            useValue: ruleRepository,
          },
          {
            provide: PrismaService,
            useValue: mockPrisma,
          },
        ],
      }).compile();

      const testService = module.get<TransactionCategorizationService>(
        TransactionCategorizationService
      );

      // Act
      await testService.applyCategory(
        transactionId,
        categoryId,
        organizationId
      );

      // Assert
      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: {
          id: transactionId,
          organizationId,
        },
        data: {
          categoryId,
          updatedAt: expect.any(Date),
        },
      });
    });
  });
});
