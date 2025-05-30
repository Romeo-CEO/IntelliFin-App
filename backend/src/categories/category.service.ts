import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryFilters,
  CategoryRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from './category.repository';
import { CategorizationRuleRepository } from './categorization-rule.repository';
import { TransactionCategorizationService } from './transaction-categorization.service';
import { Category, CategoryType } from '@prisma/client';

export interface CategoryAnalytics {
  totalCategories: number;
  categoriesByType: Record<CategoryType, number>;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
  topCategories: Array<{
    id: string;
    name: string;
    type: CategoryType;
    transactionCount: number;
    totalAmount: number;
    percentage: number;
  }>;
  categoryUsageOverTime: Array<{
    date: string;
    categorized: number;
    uncategorized: number;
  }>;
}

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly ruleRepository: CategorizationRuleRepository,
    private readonly categorizationService: TransactionCategorizationService
  ) {}

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    try {
      // Check if category name already exists
      const exists = await this.categoryRepository.existsByName(
        data.organizationId,
        data.name,
        data.parentId
      );

      if (exists) {
        throw new BadRequestException(`Category '${data.name}' already exists`);
      }

      // Validate parent category if provided
      if (data.parentId) {
        const parent = await this.categoryRepository.findById(
          data.parentId,
          data.organizationId
        );
        if (!parent) {
          throw new BadRequestException('Parent category not found');
        }

        // Ensure parent and child have same type
        if (parent.type !== data.type) {
          throw new BadRequestException(
            'Parent and child categories must have the same type'
          );
        }
      }

      const category = await this.categoryRepository.create(data);

      this.logger.log(`Created category: ${category.name} (${category.id})`);
      return category;
    } catch (error) {
      this.logger.error(`Failed to create category: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string, organizationId: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id, organizationId);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Get categories with filters
   */
  async getCategories(filters: CategoryFilters): Promise<Category[]> {
    return await this.categoryRepository.findMany(filters);
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(organizationId: string, type?: CategoryType) {
    return await this.categoryRepository.getHierarchy(organizationId, type);
  }

  /**
   * Get categories with statistics
   */
  async getCategoriesWithStats(organizationId: string) {
    return await this.categoryRepository.getCategoriesWithStats(organizationId);
  }

  /**
   * Update category
   */
  async updateCategory(
    id: string,
    organizationId: string,
    data: UpdateCategoryData
  ): Promise<Category> {
    try {
      // Check if category exists
      const existingCategory = await this.categoryRepository.findById(
        id,
        organizationId
      );
      if (!existingCategory) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      // Check name uniqueness if name is being changed
      if (data.name && data.name !== existingCategory.name) {
        const exists = await this.categoryRepository.existsByName(
          organizationId,
          data.name,
          data.parentId ?? existingCategory.parentId,
          id
        );

        if (exists) {
          throw new BadRequestException(
            `Category '${data.name}' already exists`
          );
        }
      }

      // Validate parent category if being changed
      if (
        data.parentId !== undefined &&
        data.parentId !== existingCategory.parentId
      ) {
        if (data.parentId) {
          const parent = await this.categoryRepository.findById(
            data.parentId,
            organizationId
          );
          if (!parent) {
            throw new BadRequestException('Parent category not found');
          }

          // Prevent circular references
          if (data.parentId === id) {
            throw new BadRequestException('Category cannot be its own parent');
          }

          // Check if the new parent would create a circular reference
          const path = await this.categoryRepository.getCategoryPath(
            data.parentId,
            organizationId
          );
          if (path.some(cat => cat.id === id)) {
            throw new BadRequestException(
              'Cannot create circular reference in category hierarchy'
            );
          }

          // Ensure parent and child have same type
          const categoryType = data.type ?? existingCategory.type;
          if (parent.type !== categoryType) {
            throw new BadRequestException(
              'Parent and child categories must have the same type'
            );
          }
        }
      }

      const updatedCategory = await this.categoryRepository.update(
        id,
        organizationId,
        data
      );

      this.logger.log(`Updated category: ${updatedCategory.name} (${id})`);
      return updatedCategory;
    } catch (error) {
      this.logger.error(`Failed to update category: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string, organizationId: string): Promise<void> {
    try {
      // Check if category exists
      const category = await this.categoryRepository.findById(
        id,
        organizationId
      );
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      // Check if category has children
      const children = await this.categoryRepository.findMany({
        organizationId,
        parentId: id,
        isActive: true,
      });

      if (children.length > 0) {
        throw new BadRequestException(
          'Cannot delete category with child categories'
        );
      }

      // Check if category is used in transactions
      const stats =
        await this.categoryRepository.getCategoriesWithStats(organizationId);
      const categoryStats = stats.find(s => s.id === id);

      if (categoryStats && categoryStats.transactionCount > 0) {
        throw new BadRequestException(
          'Cannot delete category that is used in transactions'
        );
      }

      await this.categoryRepository.delete(id, organizationId);

      this.logger.log(`Deleted category: ${category.name} (${id})`);
    } catch (error) {
      this.logger.error(`Failed to delete category: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Initialize default categories for organization
   */
  async initializeDefaultCategories(
    organizationId: string
  ): Promise<Category[]> {
    try {
      const existingCategories = await this.categoryRepository.findMany({
        organizationId,
        isActive: true,
      });

      if (existingCategories.length > 0) {
        this.logger.debug(
          `Organization ${organizationId} already has categories`
        );
        return existingCategories;
      }

      const defaultCategories =
        await this.categoryRepository.createDefaultCategories(organizationId);

      this.logger.log(
        `Created ${defaultCategories.length} default categories for organization ${organizationId}`
      );
      return defaultCategories;
    } catch (error) {
      this.logger.error(
        `Failed to initialize default categories: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get category analytics
   */
  async getCategoryAnalytics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CategoryAnalytics> {
    try {
      const categoriesWithStats =
        await this.categoryRepository.getCategoriesWithStats(organizationId);

      // Calculate totals
      const totalCategories = categoriesWithStats.length;
      const categoriesByType = categoriesWithStats.reduce(
        (acc, cat) => {
          acc[cat.type] = (acc[cat.type] || 0) + 1;
          return acc;
        },
        {} as Record<CategoryType, number>
      );

      const categorizedTransactions = categoriesWithStats.reduce(
        (sum, cat) => sum + cat.transactionCount,
        0
      );

      // Get uncategorized transactions count
      const uncategorizedCount = await this.getUncategorizedTransactionCount(
        organizationId,
        startDate,
        endDate
      );

      // Calculate top categories
      const totalAmount = categoriesWithStats.reduce(
        (sum, cat) => sum + cat.totalAmount,
        0
      );

      const topCategories = categoriesWithStats
        .filter(cat => cat.transactionCount > 0)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10)
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          type: cat.type,
          transactionCount: cat.transactionCount,
          totalAmount: cat.totalAmount,
          percentage:
            totalAmount > 0 ? (cat.totalAmount / totalAmount) * 100 : 0,
        }));

      // Get usage over time (last 30 days)
      const categoryUsageOverTime = await this.getCategoryUsageOverTime(
        organizationId,
        startDate,
        endDate
      );

      return {
        totalCategories,
        categoriesByType,
        categorizedTransactions,
        uncategorizedTransactions: uncategorizedCount,
        topCategories,
        categoryUsageOverTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get category analytics: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Suggest categories for uncategorized transactions
   */
  async suggestCategoriesForUncategorized(
    organizationId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const result =
        await this.categorizationService.bulkCategorizeUncategorized({
          organizationId,
          autoApply: false,
        });

      return result.results
        .filter(r => r.bestSuggestion)
        .slice(0, limit)
        .map(r => ({
          transactionId: r.transactionId,
          suggestion: r.bestSuggestion,
          allSuggestions: r.suggestions,
        }));
    } catch (error) {
      this.logger.error(
        `Failed to suggest categories: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Auto-categorize transactions
   */
  async autoCategorizeTransactions(
    organizationId: string,
    transactionIds?: string[]
  ): Promise<{ processed: number; categorized: number }> {
    try {
      const result =
        await this.categorizationService.bulkCategorizeUncategorized({
          organizationId,
          transactionIds,
          autoApply: true,
        });

      this.logger.log(
        `Auto-categorized ${result.categorized} out of ${result.processed} transactions`
      );

      return {
        processed: result.processed,
        categorized: result.categorized,
      };
    } catch (error) {
      this.logger.error(
        `Failed to auto-categorize transactions: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get uncategorized transaction count
   */
  private async getUncategorizedTransactionCount(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const where: any = {
      organizationId,
      categoryId: null,
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    return await this.categoryRepository.prisma.transaction.count({ where });
  }

  /**
   * Get category usage over time
   */
  private async getCategoryUsageOverTime(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<
    Array<{ date: string; categorized: number; uncategorized: number }>
  > {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const usage: Array<{
      date: string;
      categorized: number;
      uncategorized: number;
    }> = [];

    // Generate daily usage for the date range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(d);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const [categorized, uncategorized] = await Promise.all([
        this.categoryRepository.prisma.transaction.count({
          where: {
            organizationId,
            categoryId: { not: null },
            transactionDate: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
        this.categoryRepository.prisma.transaction.count({
          where: {
            organizationId,
            categoryId: null,
            transactionDate: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
      ]);

      usage.push({
        date: dateStr,
        categorized,
        uncategorized,
      });
    }

    return usage;
  }
}
