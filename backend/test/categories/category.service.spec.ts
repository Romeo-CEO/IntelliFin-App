import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from '../../src/categories/category.service';
import {
  CategoryRepository,
  CategoryWithStats,
} from '../../src/categories/category.repository';
import { CategorizationRuleRepository } from '../../src/categories/categorization-rule.repository';
import { TransactionCategorizationService } from '../../src/categories/transaction-categorization.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Category, CategoryType } from '@prisma/client';

// Define test enums
const CategorizationConfidence = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let ruleRepository: jest.Mocked<CategorizationRuleRepository>;
  let categorizationService: jest.Mocked<TransactionCategorizationService>;

  // Create a mock category that matches the Prisma schema
  const mockCategory: Category = {
    id: 'category-1',
    organizationId: 'org-1',
    name: 'Office Supplies',
    type: CategoryType.EXPENSE,
    parentId: null,
    chartOfAccountsCode: 'EXP-OFFICE',
    isSystem: false,
    description: 'Office supplies and stationery',
    color: '#3B82F6',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as const; // Using const assertion to preserve literal types

  const mockCategoryWithStats: CategoryWithStats = {
    ...mockCategory,
    transactionCount: 25,
    totalAmount: 1500.5,
    childrenCount: 2,
    lastUsed: new Date(),
  };

  beforeEach(async () => {
    // Create mock repository with actual methods from the interface
    categoryRepository = {
      create: jest.fn().mockResolvedValue(mockCategory),
      findById: jest.fn().mockResolvedValue(mockCategory),
      findMany: jest.fn().mockResolvedValue([mockCategory]),
      update: jest.fn().mockResolvedValue(mockCategory),
      delete: jest.fn().mockResolvedValue(undefined),
      existsByName: jest.fn().mockResolvedValue(false),
      getHierarchy: jest.fn().mockResolvedValue([]),
      getCategoriesWithStats: jest
        .fn()
        .mockResolvedValue([mockCategoryWithStats]),
      getCategoryPath: jest.fn().mockResolvedValue([mockCategory]),
      createDefaultCategories: jest.fn().mockResolvedValue([mockCategory]),
      getTransactionCountByCategory: jest.fn().mockResolvedValue(5),
    } as unknown as jest.Mocked<CategoryRepository>;

    const mockRuleRepository = {
      createDefaultRules: jest.fn(),
      getActiveRules: jest.fn().mockResolvedValue([]),
      updateMatchStats: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CategorizationRuleRepository>;

    const mockCategorizationService: jest.Mocked<TransactionCategorizationService> =
      {
        suggestCategoriesForUncategorized: jest.fn().mockResolvedValue({
          processed: 1,
          categorized: 1,
          results: [
            {
              transactionId: 'tx-1',
              suggestions: [
                {
                  categoryId: 'cat-1',
                  categoryName: 'Office Supplies',
                  confidence: CategorizationConfidence.HIGH,
                  reason: 'Matches office supply keywords',
                  score: 0.95,
                },
              ],
              bestSuggestion: {
                categoryId: 'cat-1',
                categoryName: 'Office Supplies',
                confidence: CategorizationConfidence.HIGH,
                reason: 'Matches office supply keywords',
                score: 0.95,
              },
              isAutoApplied: true,
            },
          ],
        }),
      } as unknown as jest.Mocked<TransactionCategorizationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: CategoryRepository,
          useValue: categoryRepository,
        },
        {
          provide: CategorizationRuleRepository,
          useValue: mockRuleRepository,
        },
        {
          provide: TransactionCategorizationService,
          useValue: mockCategorizationService,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    categoryRepository = module.get(CategoryRepository);
    ruleRepository = module.get(CategorizationRuleRepository);
    categorizationService = module.get(TransactionCategorizationService);

    jest
      .spyOn(categoryRepository, 'getTransactionCountByCategory' as any)
      .mockResolvedValue(5);
  });

  describe('createCategory', () => {
    const createCategoryData = {
      organizationId: 'org-1',
      name: 'Office Supplies',
      type: CategoryType.EXPENSE,
      description: 'Office supplies and stationery',
      color: '#3B82F6',
    };

    it('should create a category successfully', async () => {
      categoryRepository.existsByName.mockResolvedValue(false);
      categoryRepository.create.mockResolvedValue(mockCategory);

      const result = await service.createCategory(createCategoryData);

      expect(categoryRepository.existsByName).toHaveBeenCalledWith(
        'org-1',
        'Office Supplies',
        undefined
      );
      expect(categoryRepository.create).toHaveBeenCalledWith(
        createCategoryData
      );
      expect(result).toEqual(mockCategory);
    });

    it('should throw BadRequestException if category name already exists', async () => {
      categoryRepository.existsByName.mockResolvedValue(true);

      await expect(service.createCategory(createCategoryData)).rejects.toThrow(
        BadRequestException
      );
      expect(categoryRepository.create).not.toHaveBeenCalled();
    });

    it('should validate parent category type', async () => {
      const parentCategory = { ...mockCategory, type: CategoryType.INCOME };
      const dataWithParent = { ...createCategoryData, parentId: 'parent-1' };

      categoryRepository.existsByName.mockResolvedValue(false);
      categoryRepository.findById.mockResolvedValue(parentCategory);

      await expect(service.createCategory(dataWithParent)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if parent category not found', async () => {
      const dataWithParent = { ...createCategoryData, parentId: 'parent-1' };

      categoryRepository.existsByName.mockResolvedValue(false);
      categoryRepository.findById.mockResolvedValue(null);

      await expect(service.createCategory(dataWithParent)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getCategoryById', () => {
    it('should return category if found', async () => {
      categoryRepository.findById.mockResolvedValue(mockCategory);

      const result = await service.getCategoryById('category-1', 'org-1');

      expect(categoryRepository.findById).toHaveBeenCalledWith(
        'category-1',
        'org-1'
      );
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if category not found', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        service.getCategoryById('category-1', 'org-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCategory', () => {
    const updateData = {
      name: 'Updated Office Supplies',
      description: 'Updated description',
    };

    it('should update category successfully', async () => {
      const updatedCategory = { ...mockCategory, ...updateData };

      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.existsByName.mockResolvedValue(false);
      categoryRepository.update.mockResolvedValue(updatedCategory);

      const result = await service.updateCategory(
        'category-1',
        'org-1',
        updateData
      );

      expect(categoryRepository.update).toHaveBeenCalledWith(
        'category-1',
        'org-1',
        updateData
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundException if category not found', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateCategory('category-1', 'org-1', updateData)
      ).rejects.toThrow(NotFoundException);
    });

    it('should check name uniqueness when name is changed', async () => {
      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.existsByName.mockResolvedValue(true);

      await expect(
        service.updateCategory('category-1', 'org-1', updateData)
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent circular references', async () => {
      const updateDataWithParent = { parentId: 'category-1' };

      categoryRepository.findById.mockResolvedValue(mockCategory);

      await expect(
        service.updateCategory('category-1', 'org-1', updateDataWithParent)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.findMany.mockResolvedValue([]); // No children
      categoryRepository.getCategoriesWithStats.mockResolvedValue([
        { ...mockCategoryWithStats, transactionCount: 0 },
      ]);
      categoryRepository.delete.mockResolvedValue(undefined);

      await service.deleteCategory('category-1', 'org-1');

      expect(categoryRepository.delete).toHaveBeenCalledWith(
        'category-1',
        'org-1'
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteCategory('category-1', 'org-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if category has children', async () => {
      const childCategory = {
        ...mockCategory,
        id: 'child-1',
        parentId: 'category-1',
      };

      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.findMany.mockResolvedValue([childCategory]);

      await expect(
        service.deleteCategory('category-1', 'org-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if category has transactions', async () => {
      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.findMany.mockResolvedValue([]);
      categoryRepository.getCategoriesWithStats.mockResolvedValue([
        mockCategoryWithStats,
      ]);

      await expect(
        service.deleteCategory('category-1', 'org-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('initializeDefaultCategories', () => {
    it('should create default categories for new organization', async () => {
      const defaultCategories = [mockCategory];

      categoryRepository.findMany.mockResolvedValue([]);
      categoryRepository.createDefaultCategories.mockResolvedValue(
        defaultCategories
      );

      const result = await service.initializeDefaultCategories('org-1');

      expect(categoryRepository.createDefaultCategories).toHaveBeenCalledWith(
        'org-1'
      );
      expect(result).toEqual(defaultCategories);
    });

    it('should return existing categories if organization already has categories', async () => {
      const existingCategories = [mockCategory];

      categoryRepository.findMany.mockResolvedValue(existingCategories);

      const result = await service.initializeDefaultCategories('org-1');

      expect(categoryRepository.createDefaultCategories).not.toHaveBeenCalled();
      expect(result).toEqual(existingCategories);
    });
  });

  describe('getCategoryAnalytics', () => {
    it('should return category analytics', async () => {
      const categoriesWithStats = [mockCategoryWithStats];
      const uncategorizedCount = 10;

      categoryRepository.getCategoriesWithStats.mockResolvedValue(
        categoriesWithStats
      );
      categoryRepository.getUncategorizedTransactionCount.mockResolvedValue(
        uncategorizedCount
      );

      const result = await service.getCategoryAnalytics('org-1');

      expect(result).toEqual({
        totalCategories: 1,
        categoriesByType: { [CategoryType.EXPENSE]: 1 },
        categorizedTransactions: 25,
        uncategorizedTransactions: uncategorizedCount,
        topCategories: expect.any(Array),
        categoryUsageOverTime: expect.any(Array),
      });
    });
  });

  describe('suggestCategoriesForUncategorized', () => {
    it('should return category suggestions', async () => {
      const mockResult = {
        processed: 1,
        categorized: 1,
        results: [
          {
            transactionId: 'tx-1',
            suggestions: [
              {
                categoryId: 'cat-1',
                categoryName: 'Office Supplies',
                confidence: CategorizationConfidence.HIGH,
                reason: 'Matches office supply keywords',
                score: 0.95,
              },
            ],
            bestSuggestion: {
              categoryId: 'cat-1',
              categoryName: 'Office Supplies',
              confidence: CategorizationConfidence.HIGH,
              reason: 'Matches office supply keywords',
              score: 0.95,
            },
            isAutoApplied: true,
          },
        ],
      };

      categorizationService.bulkCategorizeUncategorized.mockResolvedValue(
        mockResult
      );

      const result = await service.suggestCategoriesForUncategorized(
        'org-1',
        50
      );

      expect(
        categorizationService.bulkCategorizeUncategorized
      ).toHaveBeenCalledWith({
        organizationId: 'org-1',
        autoApply: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        transactionId: 'tx-1',
        suggestion: mockResult.results[0].bestSuggestion,
        allSuggestions: mockResult.results[0].suggestions,
      });
    });
  });

  describe('autoCategorizeTransactions', () => {
    it('should auto-categorize transactions', async () => {
      const mockResult = {
        processed: 50,
        categorized: 35,
        results: [],
      };

      categorizationService.bulkCategorizeUncategorized.mockResolvedValue(
        mockResult
      );

      const result = await service.autoCategorizeTransactions('org-1');

      expect(
        categorizationService.bulkCategorizeUncategorized
      ).toHaveBeenCalledWith({
        organizationId: 'org-1',
        transactionIds: undefined,
        autoApply: true,
      });
      expect(result).toEqual({
        processed: 50,
        categorized: 35,
      });
    });

    it('should auto-categorize specific transactions', async () => {
      const transactionIds = ['tx-1', 'tx-2'];
      const mockResult = {
        processed: 2,
        categorized: 2,
        results: [],
      };

      categorizationService.bulkCategorizeUncategorized.mockResolvedValue(
        mockResult
      );

      const result = await service.autoCategorizeTransactions(
        'org-1',
        transactionIds
      );

      expect(
        categorizationService.bulkCategorizeUncategorized
      ).toHaveBeenCalledWith({
        organizationId: 'org-1',
        transactionIds,
        autoApply: true,
      });
      expect(result).toEqual({
        processed: 2,
        categorized: 2,
      });
    });
  });
});
