import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Expense, ExpenseStatus, Prisma } from '@prisma/client';
import { ExpenseRepository, ExpenseFilters, ExpenseStats } from './expense.repository';
import { CategoryService } from '../categories/category.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './dto/expense.dto';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly categoryService: CategoryService,
  ) {}

  /**
   * Create a new expense
   */
  async createExpense(
    organizationId: string,
    userId: string,
    createExpenseDto: CreateExpenseDto,
  ): Promise<Expense> {
    try {
      // Validate category exists and belongs to organization
      await this.categoryService.getCategoryById(createExpenseDto.categoryId, organizationId);

      // Validate transaction if provided
      if (createExpenseDto.transactionId) {
        // TODO: Add transaction validation when transaction service is available
        // await this.transactionService.getTransactionById(createExpenseDto.transactionId, organizationId);
      }

      // Validate recurrence settings
      if (createExpenseDto.isRecurring && !createExpenseDto.recurrencePattern) {
        throw new BadRequestException('Recurrence pattern is required for recurring expenses');
      }

      if (!createExpenseDto.isRecurring && createExpenseDto.recurrencePattern) {
        throw new BadRequestException('Recurrence pattern should not be set for non-recurring expenses');
      }

      // Calculate VAT if not provided (16% VAT rate for Zambia)
      let vatAmount = createExpenseDto.vatAmount || 0;
      if (vatAmount === 0 && createExpenseDto.isTaxDeductible) {
        // Auto-calculate VAT at 16% if not provided
        vatAmount = createExpenseDto.amount * 0.16;
      }

      const expenseData: Prisma.ExpenseCreateInput = {
        organization: {
          connect: { id: organizationId },
        },
        category: {
          connect: { id: createExpenseDto.categoryId },
        },
        ...(createExpenseDto.transactionId && {
          transaction: {
            connect: { id: createExpenseDto.transactionId },
          },
        }),
        vendor: createExpenseDto.vendor,
        date: new Date(createExpenseDto.date),
        amount: createExpenseDto.amount,
        currency: createExpenseDto.currency || 'ZMW',
        description: createExpenseDto.description,
        paymentMethod: createExpenseDto.paymentMethod,
        reference: createExpenseDto.reference,
        isRecurring: createExpenseDto.isRecurring || false,
        recurrencePattern: createExpenseDto.recurrencePattern,
        recurrenceEndDate: createExpenseDto.recurrenceEndDate ? new Date(createExpenseDto.recurrenceEndDate) : null,
        isTaxDeductible: createExpenseDto.isTaxDeductible ?? true,
        vatAmount,
        withholdingTax: createExpenseDto.withholdingTax || 0,
        status: ExpenseStatus.DRAFT,
        createdBy: userId,
        notes: createExpenseDto.notes,
      };

      const expense = await this.expenseRepository.create(expenseData);

      // TODO: Create recurring expenses if needed
      if (createExpenseDto.isRecurring && createExpenseDto.recurrencePattern) {
        await this.createRecurringExpenses(expense, organizationId, userId);
      }

      this.logger.log(`Created expense: ${expense.id} for organization: ${organizationId}`);
      return expense;
    } catch (error) {
      this.logger.error(`Failed to create expense: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(id: string, organizationId: string): Promise<Expense> {
    const expense = await this.expenseRepository.findById(id, organizationId);

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  /**
   * Update expense
   */
  async updateExpense(
    id: string,
    organizationId: string,
    userId: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<Expense> {
    try {
      // Check if expense exists
      const existingExpense = await this.getExpenseById(id, organizationId);

      // Validate category if provided
      if (updateExpenseDto.categoryId) {
        await this.categoryService.getCategoryById(updateExpenseDto.categoryId, organizationId);
      }

      // Validate transaction if provided
      if (updateExpenseDto.transactionId) {
        // TODO: Add transaction validation when transaction service is available
        // await this.transactionService.getTransactionById(updateExpenseDto.transactionId, organizationId);
      }

      // Validate status transitions
      if (updateExpenseDto.status) {
        this.validateStatusTransition(existingExpense.status, updateExpenseDto.status);
      }

      // Validate recurrence settings
      if (updateExpenseDto.isRecurring !== undefined) {
        if (updateExpenseDto.isRecurring && !updateExpenseDto.recurrencePattern && !existingExpense.recurrencePattern) {
          throw new BadRequestException('Recurrence pattern is required for recurring expenses');
        }
        if (!updateExpenseDto.isRecurring && updateExpenseDto.recurrencePattern) {
          throw new BadRequestException('Recurrence pattern should not be set for non-recurring expenses');
        }
      }

      // Prepare update data
      const updateData: Prisma.ExpenseUpdateInput = {};

      if (updateExpenseDto.categoryId) {
        updateData.category = { connect: { id: updateExpenseDto.categoryId } };
      }

      if (updateExpenseDto.transactionId) {
        updateData.transaction = { connect: { id: updateExpenseDto.transactionId } };
      }

      if (updateExpenseDto.vendor !== undefined) updateData.vendor = updateExpenseDto.vendor;
      if (updateExpenseDto.date) updateData.date = new Date(updateExpenseDto.date);
      if (updateExpenseDto.amount !== undefined) updateData.amount = updateExpenseDto.amount;
      if (updateExpenseDto.currency) updateData.currency = updateExpenseDto.currency;
      if (updateExpenseDto.description) updateData.description = updateExpenseDto.description;
      if (updateExpenseDto.paymentMethod) updateData.paymentMethod = updateExpenseDto.paymentMethod;
      if (updateExpenseDto.reference !== undefined) updateData.reference = updateExpenseDto.reference;
      if (updateExpenseDto.isRecurring !== undefined) updateData.isRecurring = updateExpenseDto.isRecurring;
      if (updateExpenseDto.recurrencePattern) updateData.recurrencePattern = updateExpenseDto.recurrencePattern;
      if (updateExpenseDto.recurrenceEndDate) {
        updateData.recurrenceEndDate = new Date(updateExpenseDto.recurrenceEndDate);
      }
      if (updateExpenseDto.isTaxDeductible !== undefined) updateData.isTaxDeductible = updateExpenseDto.isTaxDeductible;
      if (updateExpenseDto.vatAmount !== undefined) updateData.vatAmount = updateExpenseDto.vatAmount;
      if (updateExpenseDto.withholdingTax !== undefined) updateData.withholdingTax = updateExpenseDto.withholdingTax;
      if (updateExpenseDto.status) {
        updateData.status = updateExpenseDto.status;
        if (updateExpenseDto.status === ExpenseStatus.APPROVED) {
          updateData.approvedBy = userId;
          updateData.approvedAt = new Date();
        }
      }
      if (updateExpenseDto.notes !== undefined) updateData.notes = updateExpenseDto.notes;

      const expense = await this.expenseRepository.update(id, organizationId, updateData);

      this.logger.log(`Updated expense: ${expense.id}`);
      return expense;
    } catch (error) {
      this.logger.error(`Failed to update expense: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete expense
   */
  async deleteExpense(id: string, organizationId: string): Promise<void> {
    try {
      // Check if expense exists
      await this.getExpenseById(id, organizationId);

      await this.expenseRepository.delete(id, organizationId);

      this.logger.log(`Deleted expense: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete expense: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get expenses with filters and pagination
   */
  async getExpenses(organizationId: string, query: ExpenseQueryDto) {
    try {
      const filters: ExpenseFilters = {
        organizationId,
        categoryId: query.categoryId,
        status: query.status,
        paymentMethod: query.paymentMethod,
        vendor: query.vendor,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        amountMin: query.amountMin,
        amountMax: query.amountMax,
        isRecurring: query.isRecurring,
        isTaxDeductible: query.isTaxDeductible,
        search: query.search,
      };

      // Build order by clause
      const orderBy: Prisma.ExpenseOrderByWithRelationInput = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder || 'desc';
      } else {
        orderBy.date = 'desc';
      }

      return await this.expenseRepository.findMany(
        filters,
        query.page || 1,
        query.limit || 20,
        orderBy,
      );
    } catch (error) {
      this.logger.error(`Failed to get expenses: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get expense statistics
   */
  async getExpenseStats(organizationId: string, dateFrom?: string, dateTo?: string): Promise<ExpenseStats> {
    try {
      const fromDate = dateFrom ? new Date(dateFrom) : undefined;
      const toDate = dateTo ? new Date(dateTo) : undefined;

      return await this.expenseRepository.getStats(organizationId, fromDate, toDate);
    } catch (error) {
      this.logger.error(`Failed to get expense stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Approve expense
   */
  async approveExpense(id: string, organizationId: string, userId: string): Promise<Expense> {
    return await this.updateExpense(id, organizationId, userId, {
      status: ExpenseStatus.APPROVED,
    });
  }

  /**
   * Reject expense
   */
  async rejectExpense(id: string, organizationId: string, userId: string, notes?: string): Promise<Expense> {
    return await this.updateExpense(id, organizationId, userId, {
      status: ExpenseStatus.REJECTED,
      notes,
    });
  }

  /**
   * Submit expense for approval
   */
  async submitForApproval(id: string, organizationId: string, userId: string): Promise<Expense> {
    try {
      // Check if expense exists and is in draft status
      const expense = await this.getExpenseById(id, organizationId);

      if (expense.status !== ExpenseStatus.DRAFT) {
        throw new BadRequestException('Only draft expenses can be submitted for approval');
      }

      // Update expense status to pending approval
      const updatedExpense = await this.updateExpense(id, organizationId, userId, {
        status: ExpenseStatus.PENDING_APPROVAL,
      });

      this.logger.log(`Submitted expense ${id} for approval`);
      return updatedExpense;
    } catch (error) {
      this.logger.error(`Failed to submit expense for approval: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: ExpenseStatus, newStatus: ExpenseStatus): void {
    const validTransitions: Record<ExpenseStatus, ExpenseStatus[]> = {
      [ExpenseStatus.DRAFT]: [ExpenseStatus.PENDING_APPROVAL, ExpenseStatus.APPROVED],
      [ExpenseStatus.PENDING_APPROVAL]: [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED, ExpenseStatus.DRAFT],
      [ExpenseStatus.APPROVED]: [], // Cannot change from approved
      [ExpenseStatus.REJECTED]: [ExpenseStatus.DRAFT, ExpenseStatus.PENDING_APPROVAL],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Create recurring expenses (placeholder for future implementation)
   */
  private async createRecurringExpenses(
    parentExpense: Expense,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    // TODO: Implement recurring expense creation logic
    // This would create future expense records based on the recurrence pattern
    this.logger.log(`Creating recurring expenses for parent: ${parentExpense.id}`);
  }
}
