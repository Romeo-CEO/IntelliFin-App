import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './dto/expense.dto';
import {
  ExpenseResponseDto,
  ExpenseListResponseDto,
  ExpenseStatsResponseDto,
} from './dto/expense-response.dto';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Create expense',
    description: 'Create a new expense record with proper categorization and validation',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Expense created successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid expense data provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async createExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) createExpenseDto: CreateExpenseDto,
  ) {
    return await this.expenseService.createExpense(
      user.organizationId,
      user.id,
      createExpenseDto,
    );
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get expenses',
    description: 'Get a paginated list of expenses with optional filters',
  })
  @ApiQuery({ type: ExpenseQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expenses retrieved successfully',
    type: ExpenseListResponseDto,
  })
  async getExpenses(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: ExpenseQueryDto,
  ) {
    return await this.expenseService.getExpenses(user.organizationId, query);
  }

  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get expense statistics',
    description: 'Get comprehensive expense statistics and analytics',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Start date for statistics (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'End date for statistics (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense statistics retrieved successfully',
    type: ExpenseStatsResponseDto,
  })
  async getExpenseStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.expenseService.getExpenseStats(user.organizationId, dateFrom, dateTo);
  }

  @Get(':id')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Get expense by ID',
    description: 'Get detailed information about a specific expense',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense retrieved successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expense not found',
  })
  async getExpenseById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.expenseService.getExpenseById(id, user.organizationId);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Update expense',
    description: 'Update an existing expense record',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense updated successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid expense data provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expense not found',
  })
  async updateExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(ValidationPipe) updateExpenseDto: UpdateExpenseDto,
  ) {
    return await this.expenseService.updateExpense(
      id,
      user.organizationId,
      user.id,
      updateExpenseDto,
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Delete expense',
    description: 'Soft delete an expense record',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Expense deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expense not found',
  })
  async deleteExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.expenseService.deleteExpense(id, user.organizationId);
  }

  @Put(':id/approve')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Approve expense',
    description: 'Approve a pending expense',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense approved successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expense not found',
  })
  async approveExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return await this.expenseService.approveExpense(id, user.organizationId, user.id);
  }

  @Put(':id/reject')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Reject expense',
    description: 'Reject a pending expense with optional notes',
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense rejected successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Expense not found',
  })
  async rejectExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return await this.expenseService.rejectExpense(id, user.organizationId, user.id, notes);
  }
}
