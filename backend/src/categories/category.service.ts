import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Category,
  CategoryType,
  Prisma,
  Transaction as PrismaTransaction,
} from '@prisma/client';
import {
  CategoryAnalytics,
  CategoryFilters,
  CategoryHierarchy,
  CategoryWithStats,
  CreateCategoryData,
  UpdateCategoryData,
} from './category.repository';
import { CategoryRepository } from './category.repository';
import { CategorizationRuleRepository } from './categorization-rule.repository';
import { TransactionCategorizationService } from './transaction-categorization.service';
import {
  CategoryInUseError,
  CategoryNameExistsError,
  CategoryNotFoundError,
  CircularCategoryDependencyError,
  InvalidCategoryHierarchyError,
} from './errors';

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
      return await this.categoryRepository.create(data);
    } catch (error) {
      if (
        error instanceof CategoryNameExistsError ||
        error instanceof CircularCategoryDependencyError
      ) {
        throw new ConflictException(error.message);
      }
      this.logger.error('Failed to create category', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string, organizationId: string): Promise<Category> {
    try {
      return await this.categoryRepository.findById(id, organizationId);
    } catch (error) {
      if (error instanceof CategoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      this.logger.error(
        `Failed to get category by ID: ${id}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get categories with optional filters
   */
  async getCategories(
    filters: CategoryFilters,
    orderBy?: Prisma.CategoryOrderByWithRelationInput
  ): Promise<Category[]> {
    try {
      return await this.categoryRepository.findMany(filters, orderBy);
    } catch (error) {
      this.logger.error('Failed to get categories', error);
      throw error;
    }
  }

  /**
   * Update a category
   */
  async updateCategory(
    id: string,
    organizationId: string,
    data: UpdateCategoryData
  ): Promise<Category> {
    try {
      return await this.categoryRepository.update(id, organizationId, data);
    } catch (error) {
      if (error instanceof CategoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (
        error instanceof CategoryNameExistsError ||
        error instanceof CircularCategoryDependencyError ||
        error instanceof InvalidCategoryHierarchyError
      ) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(`Failed to update category: ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string, organizationId: string): Promise<void> {
    try {
      await this.categoryRepository.delete(id, organizationId);
    } catch (error) {
      if (error instanceof CategoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (
        error instanceof CategoryInUseError ||
        error instanceof InvalidCategoryHierarchyError
      ) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(`Failed to delete category: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(
    organizationId: string,
    type?: CategoryType
  ): Promise<CategoryHierarchy[]> {
    try {
      return await this.categoryRepository.getHierarchy(organizationId, type);
    } catch (error) {
      this.logger.error('Failed to get category hierarchy', error);
      throw error;
    }
  }

  /**
   * Get categories with statistics
   */
  async getCategoriesWithStats(
    organizationId: string
  ): Promise<CategoryWithStats[]> {
    try {
      return await this.categoryRepository.getCategoriesWithStats(organizationId);
    } catch (error) {
      this.logger.error('Failed to get categories with stats', error);
      throw error;
    }
  }

  /**
   * Get category path
   */
  async getCategoryPath(
    id: string,
    organizationId: string
  ): Promise<Category[]> {
    try {
      return await this.categoryRepository.getCategoryPath(id, organizationId);
    } catch (error) {
      if (error instanceof CategoryNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvalidCategoryHierarchyError) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(
        `Failed to get category path for ID: ${id}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get category analytics
   */
  async getCategoryAnalytics(organizationId: string): Promise<CategoryAnalytics> {
    try {
      // Get all categories with their transaction counts and amounts
      const categories = await this.categoryRepository.getCategoriesWithStats(
        organizationId
      );

      // Get total transaction counts
      const totalTransactions = categories.reduce(
        (sum, cat) => sum + (cat.transactionCount || 0),
        0
      );

      // Get uncategorized transaction count
      const uncategorizedCount =
        await this.categoryRepository.getUncategorizedTransactionCount(
          organizationId
        );

      // Calculate total transactions including uncategorized
      const allTransactions = totalTransactions + uncategorizedCount;

      // Group by type
      const categoriesByType = categories.reduce(
        (acc, cat) => {
          acc[cat.type] = (acc[cat.type] || 0) + 1;
          return acc;
        },
        {} as Record<CategoryType, number>
      );

      // Get top 5 categories by transaction count
      const topCategories = categories
        .filter((cat) => cat.transactionCount > 0)
        .sort((a, b) => b.transactionCount - a.transactionCount)
        .slice(0, 5)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          type: cat.type,
          transactionCount: cat.transactionCount,
          totalAmount: cat.totalAmount || 0,
          percentage: allTransactions > 0 
            ? Math.round((cat.transactionCount / allTransactions) * 100) 
            : 0,
        }));

      // Generate category usage over time (last 30 days)
      const usageOverTime = await this.getCategoryUsageOverTime(
        organizationId,
        30
      );

      return {
        totalCategories: categories.length,
        categoriesByType,
        categorizedTransactions: totalTransactions,
        uncategorizedTransactions: uncategorizedCount,
        topCategories,
        categoryUsageOverTime: usageOverTime,
      };
    } catch (error) {
      this.logger.error('Failed to get category analytics', error);
      throw error;
    }
  }

  /**
   * Get category usage over time
   */
  private async getCategoryUsageOverTime(
    organizationId: string,
    days: number = 30
  ): Promise<Array<{ date: string; categorized: number; uncategorized: number }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // This is a simplified example - you'll need to implement the actual query
      // based on your database schema and requirements
      const results: Array<{
        date: string;
        categorized: number;
        uncategorized: number;
      }> = [];

      // Add your actual implementation here to get daily counts
      // This is just a placeholder that returns empty data
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        results.push({
          date: date.toISOString().split('T')[0],
          categorized: Math.floor(Math.random() * 100), // Replace with actual data
          uncategorized: Math.floor(Math.random() * 50), // Replace with actual data
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to get category usage over time', error);
      return [];
    }
  }

  /**
   * Check if a category name is available
   */
  async isCategoryNameAvailable(
    organizationId: string,
    name: string,
    parentId?: string | null,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const exists = await this.categoryRepository.existsByName(
        organizationId,
        name,
        parentId,
        excludeId
      );
      return !exists;
    } catch (error) {
      this.logger.error('Failed to check category name availability', error);
      throw error;
    }
  }

  /**
   * Create default categories for an organization
   */
  async createDefaultCategories(organizationId: string): Promise<Category[]> {
    try {
      return await this.categoryRepository.createDefaultCategories(organizationId);
    } catch (error) {
      this.logger.error('Failed to create default categories', error);
      throw error;
    }
  }

  /**
   * Recategorize transactions for a category
   */
  async recategorizeTransactions(
    categoryId: string,
    organizationId: string
  ): Promise<{ recategorized: number }> {
    try {
      // Verify category exists
      await this.getCategoryById(categoryId, organizationId);

      // Get all transactions for this category
      const transactions = await this.prisma.transaction.findMany({
        where: { categoryId, organizationId },
      });

      let recategorizedCount = 0;

      // Recategorize each transaction
      for (const transaction of transactions) {
        try {
          const result = await this.categorizationService.categorizeTransaction(
            transaction.id,
            organizationId,
            true // auto-apply
          );

          if (result && result.isAutoApplied) {
            recategorizedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to recategorize transaction: ${transaction.id}`,
            error
          );
        }
      }

      return { recategorized: recategorizedCount };
    } catch (error) {
      this.logger.error('Failed to recategorize transactions', error);
      throw error;
    }
  }

  // Add the missing prisma property to fix the TypeScript error
  private get prisma() {
    return (this.categoryRepository as any).prisma as Prisma.TransactionClient;
  }
}
