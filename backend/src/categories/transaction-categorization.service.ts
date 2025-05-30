import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CategorizationRuleRepository } from './categorization-rule.repository';
import {
  CategorizationConfidence,
  CategorizationRule,
  CategorizationRuleType,
  Transaction,
} from '@prisma/client';

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: CategorizationConfidence;
  reason: string;
  ruleId?: string;
  ruleName?: string;
  score: number;
}

export interface CategorizationResult {
  transactionId: string;
  suggestions: CategorySuggestion[];
  bestSuggestion?: CategorySuggestion;
  isAutoApplied: boolean;
}

export interface BulkCategorizationOptions {
  organizationId: string;
  transactionIds?: string[];
  categoryId?: string;
  autoApply?: boolean;
  confidenceThreshold?: CategorizationConfidence;
}

@Injectable()
export class TransactionCategorizationService {
  private readonly logger = new Logger(TransactionCategorizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleRepository: CategorizationRuleRepository
  ) {}

  /**
   * Categorize a single transaction
   */
  async categorizeTransaction(
    transactionId: string,
    organizationId: string,
    autoApply: boolean = false
  ): Promise<CategorizationResult> {
    try {
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          id: transactionId,
          organizationId,
        },
      });

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      const suggestions = await this.generateSuggestions(
        transaction,
        organizationId
      );
      const bestSuggestion = this.getBestSuggestion(suggestions);

      let isAutoApplied = false;

      // Auto-apply if enabled and confidence is high enough
      if (
        autoApply &&
        bestSuggestion &&
        bestSuggestion.confidence === CategorizationConfidence.VERY_HIGH
      ) {
        await this.applyCategory(
          transactionId,
          bestSuggestion.categoryId,
          organizationId
        );
        isAutoApplied = true;
      }

      // Store suggestions
      await this.storeSuggestions(transactionId, organizationId, suggestions);

      return {
        transactionId,
        suggestions,
        bestSuggestion,
        isAutoApplied,
      };
    } catch (error) {
      this.logger.error(
        `Failed to categorize transaction ${transactionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Categorize multiple transactions
   */
  async categorizeTransactions(
    transactionIds: string[],
    organizationId: string,
    autoApply: boolean = false
  ): Promise<CategorizationResult[]> {
    const results: CategorizationResult[] = [];

    for (const transactionId of transactionIds) {
      try {
        const result = await this.categorizeTransaction(
          transactionId,
          organizationId,
          autoApply
        );
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to categorize transaction ${transactionId}:`,
          error
        );
        results.push({
          transactionId,
          suggestions: [],
          isAutoApplied: false,
        });
      }
    }

    return results;
  }

  /**
   * Bulk categorize uncategorized transactions
   */
  async bulkCategorizeUncategorized(
    options: BulkCategorizationOptions
  ): Promise<{
    processed: number;
    categorized: number;
    results: CategorizationResult[];
  }> {
    try {
      // Get uncategorized transactions
      const transactions = await this.prisma.transaction.findMany({
        where: {
          organizationId: options.organizationId,
          categoryId: null,
          id: options.transactionIds
            ? { in: options.transactionIds }
            : undefined,
        },
        take: 100, // Process in batches
        orderBy: { transactionDate: 'desc' },
      });

      const results = await this.categorizeTransactions(
        transactions.map(t => t.id),
        options.organizationId,
        options.autoApply || false
      );

      const categorized = results.filter(r => r.isAutoApplied).length;

      return {
        processed: transactions.length,
        categorized,
        results,
      };
    } catch (error) {
      this.logger.error('Failed to bulk categorize transactions:', error);
      throw error;
    }
  }

  /**
   * Apply category to transaction
   */
  async applyCategory(
    transactionId: string,
    categoryId: string,
    organizationId: string,
    userId?: string
  ): Promise<void> {
    try {
      await this.prisma.transaction.update({
        where: {
          id: transactionId,
          organizationId,
        },
        data: {
          categoryId,
          updatedAt: new Date(),
        },
      });

      // Mark suggestion as accepted if it exists
      if (userId) {
        await this.prisma.transactionCategorySuggestion.updateMany({
          where: {
            transactionId,
            categoryId,
            isAccepted: null,
          },
          data: {
            isAccepted: true,
            acceptedAt: new Date(),
            acceptedBy: userId,
          },
        });
      }

      this.logger.debug(
        `Applied category ${categoryId} to transaction ${transactionId}`
      );
    } catch (error) {
      this.logger.error(`Failed to apply category to transaction:`, error);
      throw error;
    }
  }

  /**
   * Bulk apply category to multiple transactions
   */
  async bulkApplyCategory(
    transactionIds: string[],
    categoryId: string,
    organizationId: string,
    userId?: string
  ): Promise<{ updated: number }> {
    try {
      const result = await this.prisma.transaction.updateMany({
        where: {
          id: { in: transactionIds },
          organizationId,
        },
        data: {
          categoryId,
          updatedAt: new Date(),
        },
      });

      // Mark suggestions as accepted
      if (userId) {
        await this.prisma.transactionCategorySuggestion.updateMany({
          where: {
            transactionId: { in: transactionIds },
            categoryId,
            isAccepted: null,
          },
          data: {
            isAccepted: true,
            acceptedAt: new Date(),
            acceptedBy: userId,
          },
        });
      }

      this.logger.debug(
        `Bulk applied category ${categoryId} to ${result.count} transactions`
      );
      return { updated: result.count };
    } catch (error) {
      this.logger.error('Failed to bulk apply category:', error);
      throw error;
    }
  }

  /**
   * Remove category from transaction
   */
  async removeCategory(
    transactionId: string,
    organizationId: string,
    userId?: string
  ): Promise<void> {
    try {
      await this.prisma.transaction.update({
        where: {
          id: transactionId,
          organizationId,
        },
        data: {
          categoryId: null,
          updatedAt: new Date(),
        },
      });

      // Mark suggestions as rejected
      if (userId) {
        await this.prisma.transactionCategorySuggestion.updateMany({
          where: {
            transactionId,
            isAccepted: true,
          },
          data: {
            isAccepted: false,
            acceptedAt: new Date(),
            acceptedBy: userId,
          },
        });
      }

      this.logger.debug(`Removed category from transaction ${transactionId}`);
    } catch (error) {
      this.logger.error('Failed to remove category from transaction:', error);
      throw error;
    }
  }

  /**
   * Generate category suggestions for a transaction
   */
  private async generateSuggestions(
    transaction: Transaction,
    organizationId: string
  ): Promise<CategorySuggestion[]> {
    const suggestions: CategorySuggestion[] = [];
    const rules = await this.ruleRepository.getActiveRules(organizationId);

    for (const rule of rules) {
      const match = this.evaluateRule(rule, transaction);
      if (match.isMatch) {
        // Get category name from rule or fetch it if needed
        let categoryName = 'Uncategorized';
        if ('category' in rule && rule.category) {
          categoryName = (rule as any).category.name;
        } else if (rule.categoryId) {
          const category = await this.prisma.category.findUnique({
            where: { id: rule.categoryId },
          });
          if (category) categoryName = category.name;
        }

        suggestions.push({
          categoryId: rule.categoryId,
          categoryName,
          confidence: this.adjustConfidence(rule.confidence, match.score),
          reason: match.reason,
          ruleId: rule.id,
          ruleName: rule.name || 'Unnamed Rule',
          score: match.score,
        });

        // Update rule match statistics
        await this.ruleRepository.updateMatchStats(rule.id);
      }
    }

    // Add machine learning suggestions
    const mlSuggestions = await this.generateMLSuggestions(
      transaction,
      organizationId
    );
    suggestions.push(...mlSuggestions);

    // Sort by confidence and score
    return suggestions.sort((a, b) => {
      const confidenceOrder = {
        [CategorizationConfidence.VERY_HIGH]: 4,
        [CategorizationConfidence.HIGH]: 3,
        [CategorizationConfidence.MEDIUM]: 2,
        [CategorizationConfidence.LOW]: 1,
      };

      const confidenceDiff =
        confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      if (confidenceDiff !== 0) return confidenceDiff;

      return b.score - a.score;
    });
  }

  /**
   * Evaluate a rule against a transaction
   */
  private evaluateRule(
    rule: CategorizationRule,
    transaction: Transaction
  ): {
    isMatch: boolean;
    score: number;
    reason: string;
  } {
    const { type, conditions } = rule;
    let result: { isMatch: boolean; score: number; reason: string } = {
      isMatch: false,
      score: 0,
      reason: 'No matching rule type',
    };

    try {
      // Map rule types to their corresponding evaluation methods
      const ruleHandlers: Record<
        CategorizationRuleType,
        () => { isMatch: boolean; score: number; reason: string }
      > = {
        KEYWORD_MATCH: () =>
          this.evaluateKeywordRule(conditions as any, transaction),
        AMOUNT_RANGE: () =>
          this.evaluateAmountRule(conditions as any, transaction),
        COUNTERPARTY_MATCH: () =>
          this.evaluateCounterpartyRule(conditions as any, transaction),
        DESCRIPTION_PATTERN: () =>
          this.evaluateDescriptionRule(conditions as any, transaction),
        COMBINED_RULE: () =>
          this.evaluateCombinedRule(conditions as any, transaction),
      };

      const handler = ruleHandlers[type as CategorizationRuleType];
      if (handler) {
        result = handler();
      } else {
        this.logger.warn(`Unknown rule type: ${type}`);
        result = { isMatch: false, score: 0, reason: 'Unknown rule type' };
      }
    } catch (error) {
      this.logger.error(`Error evaluating rule ${rule.id}:`, error);
      result = { isMatch: false, score: 0, reason: 'Error evaluating rule' };
    }

    return result;
  }

  /**
   * Evaluate keyword matching rule
   */
  private evaluateKeywordRule(
    conditions: any,
    transaction: Transaction
  ): {
    isMatch: boolean;
    score: number;
    reason: string;
  } {
    const keywords = conditions.keywords || [];
    const excludeKeywords = conditions.excludeKeywords || [];
    const searchText =
      `${transaction.description || ''} ${transaction.counterpartyName || ''}`.toLowerCase();

    // Check exclude keywords first
    for (const excludeKeyword of excludeKeywords) {
      if (searchText.includes(excludeKeyword.toLowerCase())) {
        return {
          isMatch: false,
          score: 0,
          reason: `Excluded by keyword: ${excludeKeyword}`,
        };
      }
    }

    const matchedKeywords: string[] = [];
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      const score = Math.min(
        100,
        (matchedKeywords.length / keywords.length) * 100
      );
      return {
        isMatch: true,
        score,
        reason: `Matched keywords: ${matchedKeywords.join(', ')}`,
      };
    }

    return { isMatch: false, score: 0, reason: 'No keywords matched' };
  }

  /**
   * Evaluate amount range rule
   */
  private evaluateAmountRule(
    conditions: any,
    transaction: Transaction
  ): {
    isMatch: boolean;
    score: number;
    reason: string;
  } {
    const amount = parseFloat(transaction.amount.toString());
    const minAmount = conditions.amountMin;
    const maxAmount = conditions.amountMax;

    if (minAmount !== undefined && amount < minAmount) {
      return {
        isMatch: false,
        score: 0,
        reason: `Amount ${amount} below minimum ${minAmount}`,
      };
    }

    if (maxAmount !== undefined && amount > maxAmount) {
      return {
        isMatch: false,
        score: 0,
        reason: `Amount ${amount} above maximum ${maxAmount}`,
      };
    }

    return {
      isMatch: true,
      score: 80,
      reason: `Amount ${amount} within range ${minAmount || 'any'} - ${maxAmount || 'any'}`,
    };
  }

  /**
   * Evaluate counterparty matching rule
   */
  private evaluateCounterpartyRule(
    conditions: any,
    transaction: Transaction
  ): {
    isMatch: boolean;
    score: number;
    reason: string;
  } {
    const patterns = conditions.counterpartyPatterns || [];
    const counterparty = (transaction.counterpartyName || '').toLowerCase();

    for (const pattern of patterns) {
      if (counterparty.includes(pattern.toLowerCase())) {
        return {
          isMatch: true,
          score: 90,
          reason: `Counterparty matches pattern: ${pattern}`,
        };
      }
    }

    return {
      isMatch: false,
      score: 0,
      reason: 'No counterparty patterns matched',
    };
  }

  /**
   * Evaluate description pattern rule
   */
  private evaluateDescriptionRule(
    conditions: any,
    transaction: Transaction
  ): {
    isMatch: boolean;
    score: number;
    reason: string;
  } {
    const patterns = conditions.descriptionPatterns || [];
    const description = (transaction.description || '').toLowerCase();

    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(description)) {
          return {
            isMatch: true,
            score: 85,
            reason: `Description matches pattern: ${pattern}`,
          };
        }
      } catch (/* error */) {
        // Invalid regex pattern
        continue;
      }
    }

    return {
      isMatch: false,
      score: 0,
      reason: 'No description patterns matched',
    };
  }

  /**
   * Evaluate combined rule
   */
  private evaluateCombinedRule(
    conditions: any,
    transaction: Transaction
  ): {
    isMatch: boolean;
    score: number;
    reason: string;
  } {
    const rules = conditions.rules || [];
    const operator = conditions.operator || 'AND'; // AND or OR

    const results = rules.map((ruleCondition: any) => {
      switch (ruleCondition.type) {
        case 'keyword':
          return this.evaluateKeywordRule(ruleCondition, transaction);
        case 'amount':
          return this.evaluateAmountRule(ruleCondition, transaction);
        case 'counterparty':
          return this.evaluateCounterpartyRule(ruleCondition, transaction);
        case 'description':
          return this.evaluateDescriptionRule(ruleCondition, transaction);
        default:
          return { isMatch: false, score: 0, reason: 'Unknown sub-rule type' };
      }
    });

    if (operator === 'AND') {
      const allMatch = results.every(r => r.isMatch);
      if (allMatch) {
        const avgScore =
          results.reduce((sum, r) => sum + r.score, 0) / results.length;
        const reasons = results.map(r => r.reason).join(' AND ');
        return { isMatch: true, score: avgScore, reason: reasons };
      }
    } else if (operator === 'OR') {
      const anyMatch = results.some(r => r.isMatch);
      if (anyMatch) {
        const bestResult = results.reduce((best, current) =>
          current.score > best.score ? current : best
        );
        return bestResult;
      }
    }
    return {
      isMatch: false,
      score: 0,
      reason: 'Combined rule conditions not met',
    };
  }

  /**
   * Generate machine learning-based suggestions
   * @public for testing purposes
   */
  public async generateMLSuggestions(
    transaction: Transaction,
    organizationId: string
  ): Promise<CategorySuggestion[]> {
    try {
      // Find similar transactions and their categories
      const similarTransactions = await this.prisma.transaction.findMany({
        where: {
          organizationId,
          id: { not: transaction.id },
          categoryId: { not: null },
          OR: [
            {
              reference: {
                contains: transaction.reference || '',
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: transaction.description?.substring(0, 20) || '',
                mode: 'insensitive',
              },
            },
          ],
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 10,
      });

      const categoryFrequency = new Map<
        string,
        { count: number; category: any }
      >();

      for (const similar of similarTransactions) {
        if (similar.category) {
          const existing = categoryFrequency.get(similar.categoryId!) || {
            count: 0,
            category: similar.category,
          };
          categoryFrequency.set(similar.categoryId!, {
            count: existing.count + 1,
            category: similar.category,
          });
        }
      }

      const suggestions: CategorySuggestion[] = [];
      for (const [categoryId, data] of categoryFrequency.entries()) {
        if (!data.category) continue;

        const confidence =
          data.count >= 3
            ? CategorizationConfidence.HIGH
            : data.count >= 2
              ? CategorizationConfidence.MEDIUM
              : CategorizationConfidence.LOW;

        suggestions.push({
          categoryId,
          categoryName: data.category.name,
          confidence,
          reason: `Found ${data.count} similar transactions`,
          score: data.count * 20, // Score based on frequency
        });
      }

      return suggestions;
    } catch (error) {
      this.logger.error('Failed to generate ML suggestions:', error);
      return [];
    }
  }

  /**
   * Get the best suggestion from a list of suggestions
   */
  private getBestSuggestion(
    suggestions: CategorySuggestion[]
  ): CategorySuggestion | undefined {
    if (!suggestions.length) return undefined;

    const confidenceOrder = {
      [CategorizationConfidence.VERY_HIGH]: 4,
      [CategorizationConfidence.HIGH]: 3,
      [CategorizationConfidence.MEDIUM]: 2,
      [CategorizationConfidence.LOW]: 1,
    };

    return suggestions.reduce((best, current) => {
      const currentOrder = confidenceOrder[current.confidence];
      const bestOrder = best ? confidenceOrder[best.confidence] : -1;

      if (currentOrder > bestOrder) return current;
      if (currentOrder === bestOrder && current.score > (best?.score || 0))
        return current;
      return best;
    });
  }

  /**
   * Store suggestions in the database
   */
  private async storeSuggestions(
    transactionId: string,
    organizationId: string,
    suggestions: CategorySuggestion[]
  ): Promise<void> {
    try {
      // Delete existing suggestions for this transaction
      await this.prisma.transactionCategorySuggestion.deleteMany({
        where: { transactionId, organizationId },
      });

      // Create new suggestions (store top 5)
      await this.prisma.transactionCategorySuggestion.createMany({
        data: suggestions.slice(0, 5).map(suggestion => ({
          transactionId,
          categoryId: suggestion.categoryId,
          organizationId,
          confidence: suggestion.confidence,
          reason: suggestion.reason,
          score: suggestion.score,
          ruleId: suggestion.ruleId,
        })),
      });
    } catch (error) {
      this.logger.error('Failed to store suggestions:', error);
      // Don't throw, as this shouldn't fail the main operation
    }
  }

  /**
   * Adjust confidence based on score
   */
  private adjustConfidence(
    _confidence: CategorizationConfidence,
    score: number
  ): CategorizationConfidence {
    if (score >= 90) return CategorizationConfidence.VERY_HIGH;
    if (score >= 70) return CategorizationConfidence.HIGH;
    if (score >= 50) return CategorizationConfidence.MEDIUM;
    return CategorizationConfidence.LOW;
  }
}
