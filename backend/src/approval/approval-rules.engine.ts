import { Injectable, Logger } from '@nestjs/common';
import { ApprovalRule, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface ApprovalCondition {
  field:
    | 'amount'
    | 'category'
    | 'submitter_role'
    | 'date'
    | 'vendor'
    | 'payment_method';
  operator:
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'eq'
    | 'ne'
    | 'in'
    | 'not_in'
    | 'contains'
    | 'starts_with';
  value: any;
}

export interface ApprovalAction {
  type: 'require_approval' | 'auto_approve' | 'notify' | 'escalate';
  approverRoles?: UserRole[];
  approverUsers?: string[];
  escalationTimeHours?: number;
  notificationTemplate?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface ApprovalRuleDefinition {
  id?: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  conditions: ApprovalCondition[];
  actions: ApprovalAction[];
}

export interface ExpenseContext {
  id: string;
  organizationId: string;
  amount: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  submitterId: string;
  submitterRole: UserRole;
  vendor?: string;
  paymentMethod: string;
  date: Date;
  description: string;
}

export interface ApprovalRequirement {
  ruleId: string;
  ruleName: string;
  priority: number;
  approverRoles: UserRole[];
  approverUsers: string[];
  escalationTimeHours?: number;
  notificationTemplate?: string;
  requirementPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

@Injectable()
export class ApprovalRulesEngine {
  private readonly logger = new Logger(ApprovalRulesEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluate all approval rules for an expense
   */
  async evaluateExpense(
    expenseContext: ExpenseContext
  ): Promise<ApprovalRequirement[]> {
    try {
      // Get all active rules for the organization, ordered by priority
      const rules = await this.getActiveRules(expenseContext.organizationId);

      const requirements: ApprovalRequirement[] = [];

      for (const rule of rules) {
        const ruleDefinition = this.parseRule(rule);

        if (
          await this.evaluateConditions(
            ruleDefinition.conditions,
            expenseContext
          )
        ) {
          // Rule matches, process actions
          const ruleRequirements = this.processActions(
            rule,
            ruleDefinition.actions
          );
          requirements.push(...ruleRequirements);

          // Update rule match statistics
          await this.updateRuleStats(rule.id);
        }
      }

      // Sort requirements by priority (higher number = higher priority)
      requirements.sort((a, b) => b.priority - a.priority);

      this.logger.log(
        `Evaluated ${rules.length} rules for expense ${expenseContext.id}, found ${requirements.length} requirements`
      );
      return requirements;
    } catch (error) {
      this.logger.error(
        `Failed to evaluate approval rules: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Create a new approval rule
   */
  async createRule(
    ruleDefinition: ApprovalRuleDefinition,
    createdBy: string
  ): Promise<ApprovalRule> {
    try {
      // Validate rule definition
      this.validateRuleDefinition(ruleDefinition);

      const ruleData: Prisma.ApprovalRuleCreateInput = {
        organization: {
          connect: { id: ruleDefinition.organizationId },
        },
        name: ruleDefinition.name,
        description: ruleDefinition.description,
        isActive: ruleDefinition.isActive,
        priority: ruleDefinition.priority,
        conditions: ruleDefinition.conditions as any,
        actions: ruleDefinition.actions as any,
        creator: {
          connect: { id: createdBy },
        },
      };

      const rule = await this.prisma.approvalRule.create({
        data: ruleData,
      });

      this.logger.log(`Created approval rule: ${rule.id} - ${rule.name}`);
      return rule;
    } catch (error) {
      this.logger.error(
        `Failed to create approval rule: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Update an existing approval rule
   */
  async updateRule(
    ruleId: string,
    updates: Partial<ApprovalRuleDefinition>
  ): Promise<ApprovalRule> {
    try {
      const updateData: Prisma.ApprovalRuleUpdateInput = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.isActive !== undefined)
        updateData.isActive = updates.isActive;
      if (updates.priority !== undefined)
        updateData.priority = updates.priority;
      if (updates.conditions) updateData.conditions = updates.conditions as any;
      if (updates.actions) updateData.actions = updates.actions as any;

      const rule = await this.prisma.approvalRule.update({
        where: { id: ruleId },
        data: updateData,
      });

      this.logger.log(`Updated approval rule: ${rule.id} - ${rule.name}`);
      return rule;
    } catch (error) {
      this.logger.error(
        `Failed to update approval rule: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete an approval rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    try {
      await this.prisma.approvalRule.delete({
        where: { id: ruleId },
      });

      this.logger.log(`Deleted approval rule: ${ruleId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete approval rule: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all rules for an organization
   */
  async getRules(
    organizationId: string,
    includeInactive: boolean = false
  ): Promise<ApprovalRule[]> {
    try {
      const where: Prisma.ApprovalRuleWhereInput = {
        organizationId,
      };

      if (!includeInactive) {
        where.isActive = true;
      }

      return await this.prisma.approvalRule.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
    } catch (error) {
      this.logger.error(
        `Failed to get approval rules: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get active rules for an organization
   */
  private async getActiveRules(
    organizationId: string
  ): Promise<ApprovalRule[]> {
    return await this.prisma.approvalRule.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Parse rule from database format
   */
  private parseRule(rule: ApprovalRule): ApprovalRuleDefinition {
    return {
      id: rule.id,
      organizationId: rule.organizationId,
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      priority: rule.priority,
      conditions: rule.conditions as ApprovalCondition[],
      actions: rule.actions as ApprovalAction[],
    };
  }

  /**
   * Evaluate rule conditions against expense context
   */
  private async evaluateConditions(
    conditions: ApprovalCondition[],
    context: ExpenseContext
  ): Promise<boolean> {
    // All conditions must be true (AND logic)
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: ApprovalCondition,
    context: ExpenseContext
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'gt':
        return fieldValue > conditionValue;
      case 'gte':
        return fieldValue >= conditionValue;
      case 'lt':
        return fieldValue < conditionValue;
      case 'lte':
        return fieldValue <= conditionValue;
      case 'eq':
        return fieldValue === conditionValue;
      case 'ne':
        return fieldValue !== conditionValue;
      case 'in':
        return (
          Array.isArray(conditionValue) && conditionValue.includes(fieldValue)
        );
      case 'not_in':
        return (
          Array.isArray(conditionValue) && !conditionValue.includes(fieldValue)
        );
      case 'contains':
        return (
          typeof fieldValue === 'string' &&
          fieldValue.toLowerCase().includes(conditionValue.toLowerCase())
        );
      case 'starts_with':
        return (
          typeof fieldValue === 'string' &&
          fieldValue.toLowerCase().startsWith(conditionValue.toLowerCase())
        );
      default:
        this.logger.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Get field value from expense context
   */
  private getFieldValue(field: string, context: ExpenseContext): any {
    switch (field) {
      case 'amount':
        return context.amount;
      case 'category':
        return context.categoryId;
      case 'submitter_role':
        return context.submitterRole;
      case 'date':
        return context.date;
      case 'vendor':
        return context.vendor;
      case 'payment_method':
        return context.paymentMethod;
      default:
        this.logger.warn(`Unknown field: ${field}`);
        return null;
    }
  }

  /**
   * Process rule actions to generate approval requirements
   */
  private processActions(
    rule: ApprovalRule,
    actions: ApprovalAction[]
  ): ApprovalRequirement[] {
    const requirements: ApprovalRequirement[] = [];

    for (const action of actions) {
      if (action.type === 'require_approval') {
        requirements.push({
          ruleId: rule.id,
          ruleName: rule.name,
          priority: rule.priority,
          approverRoles: action.approverRoles || [],
          approverUsers: action.approverUsers || [],
          escalationTimeHours: action.escalationTimeHours,
          notificationTemplate: action.notificationTemplate,
          requirementPriority: action.priority || 'NORMAL',
        });
      }
      // Handle other action types (auto_approve, notify, escalate) as needed
    }

    return requirements;
  }

  /**
   * Update rule match statistics
   */
  private async updateRuleStats(ruleId: string): Promise<void> {
    try {
      await this.prisma.approvalRule.update({
        where: { id: ruleId },
        data: {
          matchCount: {
            increment: 1,
          },
          lastMatchedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to update rule stats for ${ruleId}: ${error.message}`
      );
    }
  }

  /**
   * Validate rule definition
   */
  private validateRuleDefinition(ruleDefinition: ApprovalRuleDefinition): void {
    if (!ruleDefinition.name || ruleDefinition.name.trim().length === 0) {
      throw new Error('Rule name is required');
    }

    if (!ruleDefinition.conditions || ruleDefinition.conditions.length === 0) {
      throw new Error('At least one condition is required');
    }

    if (!ruleDefinition.actions || ruleDefinition.actions.length === 0) {
      throw new Error('At least one action is required');
    }

    // Validate conditions
    for (const condition of ruleDefinition.conditions) {
      if (
        !condition.field ||
        !condition.operator ||
        condition.value === undefined
      ) {
        throw new Error(
          'Invalid condition: field, operator, and value are required'
        );
      }
    }

    // Validate actions
    for (const action of ruleDefinition.actions) {
      if (!action.type) {
        throw new Error('Invalid action: type is required');
      }

      if (action.type === 'require_approval') {
        if (
          (!action.approverRoles || action.approverRoles.length === 0) &&
          (!action.approverUsers || action.approverUsers.length === 0)
        ) {
          throw new Error(
            'Approval action requires at least one approver role or user'
          );
        }
      }
    }
  }

  /**
   * Get default approval rules for new organizations
   */
  getDefaultRules(organizationId: string): ApprovalRuleDefinition[] {
    return [
      {
        organizationId,
        name: 'High Value Expenses',
        description: 'Expenses above K1,000 require manager approval',
        isActive: true,
        priority: 100,
        conditions: [
          {
            field: 'amount',
            operator: 'gt',
            value: 1000,
          },
        ],
        actions: [
          {
            type: 'require_approval',
            approverRoles: [UserRole.MANAGER, UserRole.ADMIN],
            escalationTimeHours: 24,
            priority: 'HIGH',
          },
        ],
      },
      {
        organizationId,
        name: 'Very High Value Expenses',
        description: 'Expenses above K5,000 require admin approval',
        isActive: true,
        priority: 200,
        conditions: [
          {
            field: 'amount',
            operator: 'gt',
            value: 5000,
          },
        ],
        actions: [
          {
            type: 'require_approval',
            approverRoles: [UserRole.ADMIN],
            escalationTimeHours: 12,
            priority: 'URGENT',
          },
        ],
      },
      {
        organizationId,
        name: 'Auto-approve Small Expenses',
        description: 'Expenses below K100 are auto-approved',
        isActive: true,
        priority: 50,
        conditions: [
          {
            field: 'amount',
            operator: 'lte',
            value: 100,
          },
        ],
        actions: [
          {
            type: 'auto_approve',
            priority: 'LOW',
          },
        ],
      },
    ];
  }
}
