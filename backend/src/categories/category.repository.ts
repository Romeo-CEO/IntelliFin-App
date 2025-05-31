import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Define the CategoryType enum locally to avoid import issues
export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

// Define missing Prisma types
type PrismaCategoryWhereInput = {
  id?: string | { equals?: string; in?: string[]; notIn?: string[] };
  name?: string | { contains?: string; mode?: 'default' | 'insensitive' };
  description?: string | { contains?: string; mode?: 'default' | 'insensitive' } | null;
  type?: CategoryType | { in?: CategoryType[] };
  parentId?: string | { equals: string | null } | null;
  organizationId?: string | { equals: string };
  isActive?: boolean;
  isSystem?: boolean;
  deletedAt?: Date | { equals: Date | null } | null;
  AND?: PrismaCategoryWhereInput | PrismaCategoryWhereInput[];
  OR?: PrismaCategoryWhereInput[];
  NOT?: PrismaCategoryWhereInput | PrismaCategoryWhereInput[];
};

type PrismaCategoryOrderByWithRelationInput = {
  name?: 'asc' | 'desc';
  type?: 'asc' | 'desc';
  sortOrder?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
};

// Define the Category interface based on the Prisma model
export interface Category {
  id: string;
  name: string;
  description: string | null;
  type: CategoryType;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  metadata: Record<string, any> | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Import errors
import {
  CategoryInUseError,
  CategoryNameExistsError,
  CategoryNotFoundError,
  CircularCategoryDependencyError,
  InvalidCategoryHierarchyError,
} from './errors';

export interface CreateCategoryData {
  organizationId: string;
  name: string;
  type: CategoryType;
  parentId?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  isActive?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  type?: CategoryType;
  parentId?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  isActive?: boolean;
}

export interface CategoryFilters {
  organizationId: string;
  type?: CategoryType;
  parentId?: string | null;
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
  transactionCount?: number;
  totalAmount?: number;
}

@Injectable()
export class CategoryRepository {
  private readonly logger = new Logger(CategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle errors consistently across the repository
   */
  private handleError(
    operation: string,
    error: unknown,
    context: Record<string, unknown> = {}
  ): never {
    this.logger.error(`Failed to ${operation}`, {
      error: error instanceof Error ? error.message : String(error),
      ...context,
    });
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error(`Failed to ${operation}`);
  }

  /**
   * Create a new category
   */
  async create(data: CreateCategoryData): Promise<Category> {
    try {
      // Check if category with same name and parent already exists
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          name: data.name,
          parentId: data.parentId || null,
          organizationId: data.organizationId,
        },
      });

      if (existingCategory) {
        throw new CategoryNameExistsError(data.name, data.parentId || undefined);
      }

      // If parentId is provided, verify it exists and belongs to the same organization
      if (data.parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: data.parentId, organizationId: data.organizationId },
        });

        if (!parent) {
          throw new CategoryNotFoundError(data.parentId);
        }

        // Check for circular dependency
        await this.checkForCircularDependency(data.parentId, data.organizationId);
      }

      return await this.prisma.category.create({
        data: {
          ...data,
          parentId: data.parentId || null,
        },
      });
    } catch (error) {
      if (
        error instanceof CategoryNameExistsError ||
        error instanceof CircularCategoryDependencyError
      ) {
        throw error;
      }
      // Create a safe context object with only the properties we want to log
      const errorContext = {
        name: data.name,
        organizationId: data.organizationId,
        parentId: data.parentId || null,
        type: data.type,
      };
      this.handleError('create category', error, errorContext);
    }
  }

  /**
   * Find category by ID
   */
  async findById(id: string, organizationId: string): Promise<Category> {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id, organizationId },
      });

      if (!category) {
        throw new CategoryNotFoundError(id);
      }

      return category;
    } catch (error) {
      if (error instanceof CategoryNotFoundError) throw error;
      this.handleError('find category by ID', error, { id, organizationId });
    }
  }

  /**
   * Find categories with optional filters
   */
  async findMany(
    where: PrismaCategoryWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: PrismaCategoryOrderByWithRelationInput;
    },
  ): Promise<Category[]> {
    try {
      return await this.prisma.category.findMany({
        where,
        ...options,
      });
    } catch (error) {
      this.handleError('find categories', error, { where, options });
    }
  }

  /**
   * Count categories with optional filters
   */
  async count(where: PrismaCategoryWhereInput): Promise<number> {
    try {
      return await this.prisma.category.count({ where });
    } catch (error) {
      this.handleError('count categories', error, { where });
    }
  }

  /**
   * Check if a category exists
   */
  async exists(where: PrismaCategoryWhereInput): Promise<boolean> {
    try {
      const count = await this.prisma.category.count({ where });
      return count > 0;
    } catch (error) {
      this.handleError('check if category exists', error, { where });
    }
  }

  /**
   * Update a category
   */
  async update(
    id: string,
    organizationId: string,
    data: UpdateCategoryData
  ): Promise<Category> {
    try {
      // Check if category exists
      const existingCategory = await this.prisma.category.findUnique({
        where: { id, organizationId },
      });

      if (!existingCategory) {
        throw new CategoryNotFoundError(id);
      }

      // If name or parent is being updated, check for duplicates
      if (data.name !== undefined || data.parentId !== undefined) {
        const name = data.name || existingCategory.name;
        const parentId = data.parentId !== undefined ? data.parentId : existingCategory.parentId;

        const existingWithSameName = await this.prisma.category.findFirst({
          where: {
            name,
            parentId: parentId || null,
            organizationId,
            NOT: { id },
          },
        });

        if (existingWithSameName) {
          throw new CategoryNameExistsError(name, parentId || undefined);
        }
      }

      // Check for circular dependency if parent is being updated
      if (data.parentId !== undefined) {
        await this.checkForCircularDependency(data.parentId, organizationId, id);
      }

      return await this.prisma.category.update({
        where: { id, organizationId },
        data,
      });
    } catch (error) {
      if (
        error instanceof CategoryNameExistsError ||
        error instanceof CategoryNotFoundError ||
        error instanceof CircularCategoryDependencyError
      ) {
        throw error;
      }
      this.handleError('update category', error, { id, organizationId, ...data });
    }
  }

  /**
   * Delete a category
   */
  async delete(id: string, organizationId: string): Promise<void> {
    try {
      // Check if category exists
      const category = await this.prisma.category.findUnique({
        where: { id, organizationId },
        include: { _count: { select: { children: true, transactions: true } } },
      });

      if (!category) {
        throw new CategoryNotFoundError(id);
      }

      // Check if category has children
      if (category._count.children > 0) {
        throw new InvalidCategoryHierarchyError(
          'Cannot delete a category that has child categories'
        );
      }

      // Check if category is in use by transactions
      if (category._count.transactions > 0) {
        throw new CategoryInUseError(category._count.transactions);
      }

      await this.prisma.category.delete({
        where: { id, organizationId },
      });
    } catch (error) {
      if (
        error instanceof CategoryNotFoundError ||
        error instanceof InvalidCategoryHierarchyError ||
        error instanceof CategoryInUseError
      ) {
        throw error;
      }
      this.handleError('delete category', error, { id, organizationId });
    }
  }

  /**
   * Check for circular dependency in category hierarchy
   */
  private async checkForCircularDependency(
    parentId: string | null,
    organizationId: string,
    excludeCategoryId?: string
  ): Promise<void> {
    if (!parentId) return;

    // If we're updating a category and checking against itself
    if (excludeCategoryId && parentId === excludeCategoryId) {
      throw new CircularCategoryDependencyError(parentId, excludeCategoryId);
    }

    // Get the parent category
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId, organizationId },
      select: { parentId: true },
    });

    if (!parent) {
      throw new CategoryNotFoundError(parentId);
    }

    // If the parent has no parent, no circular dependency
    if (!parent.parentId) return;

    // Check if we've found a circular reference
    if (excludeCategoryId && parent.parentId === excludeCategoryId) {
      throw new CircularCategoryDependencyError(parentId, excludeCategoryId);
    }

    // Recursively check up the tree
    await this.checkForCircularDependency(
      parent.parentId,
      organizationId,
      excludeCategoryId
    );
  }

  /**
   * Check if a category with the given name exists in the organization
   */
  async existsByName(
    organizationId: string,
    name: string,
    parentId?: string | null,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const where: PrismaCategoryWhereInput = {
        organizationId,
        name: { contains: name, mode: 'insensitive' },
        parentId: parentId || null,
      };

      if (excludeId) {
        where.NOT = { id: excludeId };
      }

      const count = await this.prisma.category.count({ where });
      return count > 0;
    } catch (error) {
      this.handleError('check if category name exists', error, {
        organizationId,
        name,
        parentId,
        excludeId,
      });
    }
  }

  /**
   * Build where clause for category queries
   */
  buildWhereClause(filters: CategoryFilters): PrismaCategoryWhereInput {
    const where: PrismaCategoryWhereInput = {
      deletedAt: null,
    };

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.search) {
      where.OR = [
        { 
          name: {
            contains: filters.search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: filters.search,
            mode: 'insensitive'
          }
        }
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return where;
  }

  /**
   * Build category hierarchy recursively
   */
  private buildHierarchy(
    categories: Category[],
    parentId: string | null = null,
    level: number = 0,
    parentPath: string[] = []
  ): CategoryHierarchy[] {
    return categories
      .filter((category) => category.parentId === parentId)
      .map((category) => {
        const currentPath = [...parentPath, category.id];
        const children = this.buildHierarchy(categories, category.id, level + 1, currentPath);

        return {
          ...category,
          children,
          level,
          path: currentPath,
        };
      });
  }

  /**
   * Get category hierarchy
   */
  async getHierarchy(
    organizationId: string,
    type?: CategoryType
  ): Promise<CategoryHierarchy[]> {
    try {
      const where: PrismaCategoryWhereInput = { 
        organizationId,
        deletedAt: null
      };
      
      if (type) {
        where.type = type;
      }

      const categories = await this.prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return this.buildHierarchy(categories);
    } catch (error) {
      this.handleError('get category hierarchy', error, {
        organizationId,
        type,
      });
      throw error; // Re-throw to ensure proper error handling
    }
  }

  /**
   * Get categories with statistics
   */
  async getCategoriesWithStats(organizationId: string): Promise<CategoryWithStats[]> {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        id: string;
        name: string;
        description: string | null;
        type: CategoryType;
        parentId: string | null;
        color: string | null;
        icon: string | null;
        isActive: boolean;
        isSystem: boolean;
        sortOrder: number | null;
        metadata: any;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        transactionCount: string;
        totalAmount: string;
        childrenCount: string;
        lastUsed: Date | null;
      }>>`
        SELECT 
          c.*,
          COUNT(DISTINCT t.id)::text as "transactionCount",
          COALESCE(SUM(CAST(t.amount AS DECIMAL)), '0')::text as "totalAmount",
          COUNT(children.id)::text as "childrenCount",
          MAX(t.date) as "lastUsed"
        FROM "Category" c
        LEFT JOIN "Transaction" t ON t."categoryId" = c.id AND t."deletedAt" IS NULL
        LEFT JOIN "Category" children ON children."parentId" = c.id
        WHERE c."organizationId" = ${organizationId} AND c."deletedAt" IS NULL
        GROUP BY c.id
        ORDER BY c.name ASC
      `;

      return result.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        type: category.type,
        parentId: category.parentId,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
        isSystem: category.isSystem,
        sortOrder: category.sortOrder,
        metadata: category.metadata,
        organizationId: category.organizationId,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        deletedAt: category.deletedAt,
        transactionCount: parseInt(category.transactionCount, 10) || 0,
        totalAmount: parseFloat(category.totalAmount) || 0,
        childrenCount: parseInt(category.childrenCount, 10) || 0,
        lastUsed: category.lastUsed,
      } as CategoryWithStats));
    } catch (error) {
      this.handleError('get categories with stats', error, { organizationId });
    }
  }

  /**
   * Get uncategorized transaction count for an organization
   */
  async getUncategorizedTransactionCount(organizationId: string): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*)::text as count
        FROM "Transaction"
        WHERE "organizationId" = ${organizationId}
        AND "categoryId" IS NULL
        AND "deletedAt" IS NULL
      `;
      return parseInt(result[0]?.count || '0', 10);
    } catch (error) {
      this.handleError('get uncategorized transaction count', error, { organizationId });
    }
  }

  /**
   * Create default categories for an organization
   */
  async createDefaultCategories(organizationId: string): Promise<Category[]> {
    const defaultCategories = [
      // Income categories
      { name: 'Salary', type: CategoryType.INCOME, color: '#10B981' },
      { name: 'Freelance', type: CategoryType.INCOME, color: '#3B82F6' },
      { name: 'Investments', type: CategoryType.INCOME, color: '#8B5CF6' },
      { name: 'Gifts', type: CategoryType.INCOME, color: '#EC4899' },
      { name: 'Other Income', type: CategoryType.INCOME, color: '#6B7280' },

      // Expense categories
      { name: 'Housing', type: CategoryType.EXPENSE, color: '#EF4444' },
      { name: 'Utilities', type: CategoryType.EXPENSE, color: '#F59E0B' },
      { name: 'Groceries', type: CategoryType.EXPENSE, color: '#84CC16' },
      { name: 'Transportation', type: CategoryType.EXPENSE, color: '#06B6D4' },
      { name: 'Entertainment', type: CategoryType.EXPENSE, color: '#8B5CF6' },
      { name: 'Healthcare', type: CategoryType.EXPENSE, color: '#EC4899' },
      { name: 'Shopping', type: CategoryType.EXPENSE, color: '#F97316' },
      { name: 'Education', type: CategoryType.EXPENSE, color: '#6366F1' },
      { name: 'Travel', type: CategoryType.EXPENSE, color: '#14B8A6' },
      { name: 'Other Expenses', type: CategoryType.EXPENSE, color: '#6B7280' },
    ] as const;

    try {
      const createdCategories: Category[] = [];

      for (const categoryData of defaultCategories) {
        // Check if category with same name and type already exists
        const exists = await this.existsByName(
          organizationId,
          categoryData.name,
          null,
          undefined
        );
        
        // Additional check for category type if needed
        if (exists) {
          const existingCategory = await this.prisma.category.findFirst({
            where: {
              organizationId,
              name: categoryData.name,
              type: categoryData.type,
              deletedAt: null,
            },
          });
          if (existingCategory) {
            continue; // Skip if category with same name and type exists
          }
        }

        if (!exists) {
          const category = await this.prisma.category.create({
            data: {
              ...categoryData,
              organizationId,
              parentId: null,
              isActive: true,
            },
          });
          createdCategories.push(category);
        }
      }

      this.logger.log(
        `Created ${createdCategories.length} default categories for organization ${organizationId}`
      );

      return createdCategories;
    } catch (error) {
      this.handleError('create default categories', error, { organizationId });
    }
  }
}
