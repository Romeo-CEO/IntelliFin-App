import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CategorizationConfidence,
  CategorizationRule,
  CategorizationRuleType,
  Prisma,
} from '@prisma/client';

export interface CreateRuleData {
  organizationId: string;
  categoryId: string;
  name: string;
  type: CategorizationRuleType;
  conditions: any;
  description?: string;
  confidence?: CategorizationConfidence;
  priority?: number;
  createdBy: string;
}

export interface UpdateRuleData {
  name?: string;
  type?: CategorizationRuleType;
  conditions?: any;
  description?: string;
  confidence?: CategorizationConfidence;
  priority?: number;
  isActive?: boolean;
}

export interface RuleFilters {
  organizationId: string;
  categoryId?: string;
  type?: CategorizationRuleType;
  isActive?: boolean;
  search?: string;
}

export interface RuleConditions {
  keywords?: string[];
  amountMin?: number;
  amountMax?: number;
  counterpartyPatterns?: string[];
  descriptionPatterns?: string[];
  transactionTypes?: string[];
  excludeKeywords?: string[];
}

export interface RuleWithStats {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  type: CategorizationRuleType;
  isActive: boolean;
  priority: number;
  conditions: any;
  description: string | null;
  confidence: CategorizationConfidence;
  matchCount: number;
  lastMatchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    type: string;
    color?: string;
  };
  recentMatches: number; // Matches in last 30 days
  accuracy: number; // Percentage of accepted suggestions
}

@Injectable()
export class CategorizationRuleRepository {
  private readonly logger = new Logger(CategorizationRuleRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new categorization rule
   */
  async create(data: CreateRuleData): Promise<CategorizationRule> {
    try {
      return await this.prisma.categorizationRule.create({
        data: {
          organizationId: data.organizationId,
          categoryId: data.categoryId,
          name: data.name,
          type: data.type,
          conditions: data.conditions,
          description: data.description,
          confidence: data.confidence || CategorizationConfidence.MEDIUM,
          priority: data.priority || 0,
          createdBy: data.createdBy,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create categorization rule';
      this.logger.error(
        `Failed to create categorization rule: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find rule by ID
   */
  async findById(
    id: string,
    organizationId: string
  ): Promise<CategorizationRule | null> {
    try {
      return await this.prisma.categorizationRule.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to find rule by ID';
      this.logger.error(`Failed to find rule by ID: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Find rules with filters
   */
  async findMany(
    filters: RuleFilters,
    orderBy: Prisma.CategorizationRuleOrderByWithRelationInput = {
      priority: 'desc',
    }
  ): Promise<CategorizationRule[]> {
    try {
      const where = this.buildWhereClause(filters);

      return await this.prisma.categorizationRule.findMany({
        where,
        orderBy,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to find rules: ${error.message}`, error);
      } else {
        this.logger.error('Failed to find rules: Unknown error', error);
      }
      throw error;
    }
  }

  /**
   * Get active rules for categorization
   */
  async getActiveRules(organizationId: string): Promise<CategorizationRule[]> {
    try {
      return await this.prisma.categorizationRule.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        orderBy: [
          { priority: 'desc' },
          { confidence: 'desc' },
          { createdAt: 'asc' },
        ],
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to get active rules: ${error.message}`,
          error
        );
      } else {
        this.logger.error('Failed to get active rules: Unknown error', error);
      }
      throw error;
    }
  }

  /**
   * Get rules with statistics
   */
  async getRulesWithStats(organizationId: string): Promise<RuleWithStats[]> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const rules = await this.prisma.categorizationRule.findMany({
        where: {
          organizationId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
          _count: {
            select: {
              suggestions: {
                where: {
                  createdAt: {
                    gte: thirtyDaysAgo,
                  },
                },
              },
            },
          },
        },
        orderBy: { priority: 'desc' },
      });

      const rulesWithStats: RuleWithStats[] = [];

      for (const rule of rules) {
        // Get suggestion statistics using the relation
        const suggestions =
          await this.prisma.transactionCategorySuggestion.findMany({
            where: {
              ruleId: rule.id,
              createdAt: {
                gte: thirtyDaysAgo,
              },
            },
            select: {
              isAccepted: true,
            },
          });

        const totalSuggestions = suggestions.length;
        const acceptedSuggestions = suggestions.filter(
          s => s.isAccepted === true
        ).length;
        const accuracy =
          totalSuggestions > 0
            ? (acceptedSuggestions / totalSuggestions) * 100
            : 0;

        const ruleWithStats: RuleWithStats = {
          id: rule.id,
          organizationId: rule.organizationId,
          categoryId: rule.categoryId,
          name: rule.name,
          type: rule.type,
          isActive: rule.isActive,
          priority: rule.priority,
          conditions: rule.conditions,
          description: rule.description,
          confidence: rule.confidence,
          matchCount: rule.matchCount,
          lastMatchedAt: rule.lastMatchedAt,
          createdAt: rule.createdAt,
          updatedAt: rule.updatedAt,
          recentMatches: totalSuggestions,
          accuracy: Math.round(accuracy),
          category: {
            id: rule.category?.id || '',
            name: rule.category?.name || 'Uncategorized',
            type: rule.category?.type || 'EXPENSE',
            color: rule.category?.color,
          },
        };

        rulesWithStats.push(ruleWithStats);
      }

      return rulesWithStats;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to get rules with stats: ${error.message}`,
          error
        );
      } else {
        this.logger.error(
          'Failed to get rules with stats: Unknown error',
          error
        );
      }
      throw error;
    }
  }

  /**
   * Update rule
   */
  async update(
    id: string,
    organizationId: string,
    data: UpdateRuleData
  ): Promise<CategorizationRule> {
    try {
      return await this.prisma.categorizationRule.update({
        where: {
          id,
          organizationId,
        },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update rule: ${error.message}`, error);
      } else {
        this.logger.error('Failed to update rule: Unknown error', error);
      }
      throw error;
    }
  }

  /**
   * Delete rule
   */
  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.categorizationRule.delete({
        where: {
          id,
          organizationId,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to delete rule: ${error.message}`, error);
      } else {
        this.logger.error('Failed to delete rule: Unknown error', error);
      }
      throw error;
    }
  }

  /**
   * Update rule match statistics
   */
  async updateMatchStats(id: string): Promise<void> {
    try {
      await this.prisma.categorizationRule.update({
        where: { id },
        data: {
          matchCount: {
            increment: 1,
          },
          lastMatchedAt: new Date(),
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to update match stats: ${error.message}`,
          error
        );
      } else {
        this.logger.error('Failed to update match stats: Unknown error', error);
      }
      throw error;
    }
  }

  /**
   * Check if rule name exists
   */
  async existsByName(
    organizationId: string,
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const where: Prisma.CategorizationRuleWhereInput = {
        organizationId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const count = await this.prisma.categorizationRule.count({ where });
      return count > 0;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to check rule name existence';
      this.logger.error(
        `Failed to check rule name existence: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get rules by category
   */
  async getRulesByCategory(
    categoryId: string,
    organizationId: string
  ): Promise<CategorizationRule[]> {
    try {
      return await this.prisma.categorizationRule.findMany({
        where: {
          categoryId,
          organizationId,
          isActive: true,
        },
        orderBy: { priority: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to get rules by category';
      this.logger.error(
        `Failed to get rules by category: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Create default rules for common patterns
   */
  async createDefaultRules(
    organizationId: string,
    createdBy: string
  ): Promise<CategorizationRule[]> {
    try {
      // Get existing categories
      const categories = await this.prisma.category.findMany({
        where: {
          organizationId,
          isActive: true,
        },
      });

      const defaultRules = [
        // Bank fees
        {
          name: 'Bank Fees - Transaction Charges',
          categoryName: 'Bank Fees',
          type: CategorizationRuleType.KEYWORD_MATCH,
          conditions: {
            keywords: [
              'transaction charge',
              'bank fee',
              'service charge',
              'atm fee',
              'withdrawal fee',
            ],
            excludeKeywords: [],
          },
          confidence: CategorizationConfidence.HIGH,
          priority: 90,
        },
        // Airtel Money fees
        {
          name: 'Mobile Money Fees',
          categoryName: 'Bank Fees',
          type: CategorizationRuleType.KEYWORD_MATCH,
          conditions: {
            keywords: [
              'airtel money',
              'mtn money',
              'zamtel kwacha',
              'transaction fee',
            ],
            excludeKeywords: [],
          },
          confidence: CategorizationConfidence.HIGH,
          priority: 85,
        },
        // Utilities
        {
          name: 'Electricity Bills',
          categoryName: 'Utilities',
          type: CategorizationRuleType.KEYWORD_MATCH,
          conditions: {
            keywords: [
              'zesco',
              'electricity',
              'power bill',
              'prepaid electricity',
            ],
            excludeKeywords: [],
          },
          confidence: CategorizationConfidence.HIGH,
          priority: 80,
        },
        // Fuel
        {
          name: 'Fuel Purchases',
          categoryName: 'Travel',
          type: CategorizationRuleType.KEYWORD_MATCH,
          conditions: {
            keywords: [
              'fuel',
              'petrol',
              'diesel',
              'gas station',
              'total',
              'shell',
              'puma',
            ],
            excludeKeywords: [],
          },
          confidence: CategorizationConfidence.MEDIUM,
          priority: 70,
        },
        // Office supplies
        {
          name: 'Stationery and Office Supplies',
          categoryName: 'Office Supplies',
          type: CategorizationRuleType.KEYWORD_MATCH,
          conditions: {
            keywords: [
              'stationery',
              'office supplies',
              'paper',
              'pens',
              'printing',
            ],
            excludeKeywords: [],
          },
          confidence: CategorizationConfidence.MEDIUM,
          priority: 60,
        },
      ];

      const createdRules: CategorizationRule[] = [];

      for (const ruleData of defaultRules) {
        const category = categories.find(c => c.name === ruleData.categoryName);
        if (category) {
          const exists = await this.existsByName(organizationId, ruleData.name);
          if (!exists) {
            const rule = await this.create({
              organizationId,
              categoryId: category.id,
              name: ruleData.name,
              type: ruleData.type,
              conditions: ruleData.conditions,
              confidence: ruleData.confidence,
              priority: ruleData.priority,
              createdBy,
            });
            createdRules.push(rule);
          }
        }
      }

      return createdRules;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create default rules';
      this.logger.error(
        `Failed to create default rules: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Build where clause for rule queries
   */
  private buildWhereClause(
    filters: RuleFilters
  ): Prisma.CategorizationRuleWhereInput {
    const where: Prisma.CategorizationRuleWhereInput = {
      organizationId: filters.organizationId,
    };

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.type) {
      where.type = filters.type;
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
}
