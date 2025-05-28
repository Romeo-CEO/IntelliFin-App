import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, Category, CategoryType } from '@prisma/client';

type ErrorWithMessage = {
  message: string;
};

export interface CreateCategoryData {
  organizationId: string;
  name: string;
  type: CategoryType;
  parentId?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  type?: CategoryType;
  parentId?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface CategoryFilters {
  organizationId: string;
  type?: CategoryType;
  parentId?: string;
  isActive?: boolean;
  search?: string;
}

export interface CategoryWithStats extends Category {
  transactionCount: number;
  totalAmount: number;
  childrenCount: number;
  lastUsed: Date | null;
}

export interface CategoryHierarchy extends Category {
  children: CategoryHierarchy[];
  level: number;
  path: string[];
}

@Injectable()
export class CategoryRepository {
  private readonly logger = new Logger(CategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new category
   */
  private isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as Record<string, unknown>).message === 'string'
    );
  }

  private getErrorMessage(error: unknown): string {
    if (this.isErrorWithMessage(error)) {
      return error.message;
    }
    return 'An unknown error occurred';
  }

  async create(data: CreateCategoryData): Promise<Category> {
    try {
      const categoryData: Prisma.CategoryCreateInput = {
        organization: { connect: { id: data.organizationId } },
        name: data.name,
        type: data.type,
        description: data.description,
        color: data.color,
        icon: data.icon,
        isActive: data.isActive ?? true,
      };

      if (data.parentId) {
        categoryData.parent = { connect: { id: data.parentId } };
      }

      return await this.prisma.category.create({
        data: categoryData,
        include: {
          parent: true,
          children: true,
        },
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to create category: ${errorMessage}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Find category by ID
   */
  async findById(id: string, organizationId: string): Promise<Category | null> {
    try {
      return await this.prisma.category.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to find category by ID: ${errorMessage}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Find categories with filters
   */
  async findMany(
    filters: CategoryFilters,
    orderBy: Prisma.CategoryOrderByWithRelationInput = { name: 'asc' }
  ): Promise<Category[]> {
    try {
      const where = this.buildWhereClause(filters);

      return await this.prisma.category.findMany({
        where,
        orderBy,
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to find categories: ${errorMessage}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Get category hierarchy
   */
  async getHierarchy(organizationId: string, type?: CategoryType): Promise<CategoryHierarchy[]> {
    try {
      const where: Prisma.CategoryWhereInput = {
        organizationId,
        isActive: true,
        parentId: null, // Start with root categories
      };

      if (type) {
        where.type = type;
      }

      const rootCategories = await this.prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
            include: {
              children: {
                where: { isActive: true },
                orderBy: { name: 'asc' },
                include: {
                  children: {
                    where: { isActive: true },
                    orderBy: { name: 'asc' },
                  },
                },
              },
            },
          },
        },
      });

      return this.buildHierarchy(rootCategories, 0, []);
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to get category hierarchy: ${errorMessage}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Get categories with statistics
   */
  async getCategoriesWithStats(organizationId: string): Promise<CategoryWithStats[]> {
    try {
      const categories = await this.prisma.category.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        include: {
          transactions: {
            select: {
              amount: true,
              transactionDate: true,
            },
          },
          children: {
            where: { isActive: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return categories.map(category => {
        const transactionCount = category.transactions.length;
        const totalAmount = category.transactions.reduce(
          (sum, tx) => sum + parseFloat(tx.amount.toString()),
          0
        );
        const lastUsed = category.transactions.length > 0
          ? new Date(Math.max(...category.transactions.map(tx => tx.transactionDate.getTime())))
          : null;

        return {
          ...category,
          transactionCount,
          totalAmount,
          childrenCount: category.children.length,
          lastUsed,
        } as CategoryWithStats;
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to get categories with stats: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Update category
   */
  async update(id: string, organizationId: string, data: UpdateCategoryData): Promise<Category> {
    try {
      return await this.prisma.category.update({
        where: {
          id,
          organizationId,
        },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to update category: ${errorMessage}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Delete category (soft delete)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.category.update({
        where: {
          id,
          organizationId,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to delete category: ${errorMessage}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Check if category name exists
   */
  async existsByName(organizationId: string, name: string): Promise<boolean> {
    try {
      const count = await this.prisma.category.count({
        where: {
          organizationId,
          name,
          isActive: true,
        },
      });
      return count > 0;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to check if category name exists: ${errorMessage}`, error);
      throw error;
    }
  }
  async getCategoryPath(id: string, organizationId: string): Promise<Category[]> {
    try {
      const path: Category[] = [];
      let currentCategory = await this.findById(id, organizationId);

      while (currentCategory) {
        path.unshift(currentCategory);
        if (currentCategory.parentId) {
          currentCategory = await this.findById(currentCategory.parentId, organizationId);
        } else {
          break;
        }
      }

      return path;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to get category path: ${errorMessage}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Get default categories for organization
   */
  async createDefaultCategories(organizationId: string): Promise<Category[]> {
    try {
      const defaultCategories = [
        // Income categories
        { name: 'Sales Revenue', type: CategoryType.INCOME, color: '#10B981', icon: 'TrendingUp' },
        { name: 'Service Revenue', type: CategoryType.INCOME, color: '#059669', icon: 'Briefcase' },
        { name: 'Interest Income', type: CategoryType.INCOME, color: '#047857', icon: 'Percent' },
        { name: 'Other Income', type: CategoryType.INCOME, color: '#065F46', icon: 'Plus' },

        // Expense categories
        { name: 'Office Supplies', type: CategoryType.EXPENSE, color: '#EF4444', icon: 'Package' },
        { name: 'Marketing', type: CategoryType.EXPENSE, color: '#DC2626', icon: 'Megaphone' },
        { name: 'Travel', type: CategoryType.EXPENSE, color: '#B91C1C', icon: 'Plane' },
        { name: 'Utilities', type: CategoryType.EXPENSE, color: '#991B1B', icon: 'Zap' },
        { name: 'Rent', type: CategoryType.EXPENSE, color: '#7F1D1D', icon: 'Home' },
        { name: 'Professional Services', type: CategoryType.EXPENSE, color: '#F59E0B', icon: 'Users' },
        { name: 'Insurance', type: CategoryType.EXPENSE, color: '#D97706', icon: 'Shield' },
        { name: 'Bank Fees', type: CategoryType.EXPENSE, color: '#B45309', icon: 'CreditCard' },
        { name: 'Taxes', type: CategoryType.EXPENSE, color: '#92400E', icon: 'FileText' },
        { name: 'Other Expenses', type: CategoryType.EXPENSE, color: '#78350F', icon: 'Minus' },
      ];

      const createdCategories: Category[] = [];

      for (const categoryData of defaultCategories) {
        const exists = await this.existsByName(organizationId, categoryData.name);
        if (!exists) {
          const category = await this.create({
            organizationId,
            ...categoryData,
          });
          createdCategories.push(category);
        }
      }

      return createdCategories;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to create default categories: ${errorMessage}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Build where clause for category queries
   */
  private buildWhereClause(filters: CategoryFilters): Prisma.CategoryWhereInput {
    const where: Prisma.CategoryWhereInput = {
      organizationId: filters.organizationId,
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Build category hierarchy recursively
   */
  private buildHierarchy(
    categories: any[],
    level: number,
    parentPath: string[]
  ): CategoryHierarchy[] {
    return categories.map(category => {
      const currentPath = [...parentPath, category.name];
      
      return {
        ...category,
        level,
        path: currentPath,
        children: category.children 
          ? this.buildHierarchy(category.children, level + 1, currentPath)
          : [],
      };
    });
  }

  /**
   * Get count of uncategorized transactions
   */
  async getUncategorizedTransactionCount(organizationId: string): Promise<number> {
    try {
      return await this.prisma.transaction.count({
        where: {
          organizationId,
          categoryId: null,
        },
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to get uncategorized transaction count: ${errorMessage}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }
}
