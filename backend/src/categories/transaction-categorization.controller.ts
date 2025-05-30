import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

import { TransactionCategorizationService } from './transaction-categorization.service';
import {
  ApplyCategoryDto,
  BulkApplyCategoryDto,
  BulkCategorizeDto,
  CategorizeTransactionDto,
} from './dto/transaction-categorization.dto';

@ApiTags('Transaction Categorization')
@Controller('transactions/categorization')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionCategorizationController {
  constructor(
    private readonly categorizationService: TransactionCategorizationService
  ) {}

  @Post('suggest/:transactionId')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get category suggestions for transaction',
    description:
      'Generate AI-powered category suggestions for a specific transaction',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'Transaction ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: CategorizeTransactionDto })
  @ApiResponse({
    status: 200,
    description: 'Category suggestions generated successfully',
    schema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string' },
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              categoryId: { type: 'string' },
              categoryName: { type: 'string' },
              confidence: {
                type: 'string',
                enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
              },
              reason: { type: 'string' },
              ruleId: { type: 'string', nullable: true },
              ruleName: { type: 'string', nullable: true },
              score: { type: 'number' },
            },
          },
        },
        bestSuggestion: {
          type: 'object',
          nullable: true,
          properties: {
            categoryId: { type: 'string' },
            categoryName: { type: 'string' },
            confidence: { type: 'string' },
            reason: { type: 'string' },
            score: { type: 'number' },
          },
        },
        isAutoApplied: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async suggestCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body(ValidationPipe) categorizeDto: CategorizeTransactionDto
  ) {
    return await this.categorizationService.categorizeTransaction(
      transactionId,
      user.organizationId,
      categorizeDto.autoApply || false
    );
  }

  @Post('suggest/bulk')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get category suggestions for multiple transactions',
    description:
      'Generate AI-powered category suggestions for multiple transactions',
  })
  @ApiBody({ type: BulkCategorizeDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk category suggestions generated successfully',
  })
  async bulkSuggestCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) bulkCategorizeDto: BulkCategorizeDto
  ) {
    return await this.categorizationService.categorizeTransactions(
      bulkCategorizeDto.transactionIds,
      user.organizationId,
      bulkCategorizeDto.autoApply || false
    );
  }

  @Post('apply/:transactionId')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'Apply category to transaction',
    description: 'Manually apply a category to a specific transaction',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'Transaction ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: ApplyCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Category applied successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction or category not found',
  })
  async applyCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body(ValidationPipe) applyCategoryDto: ApplyCategoryDto
  ) {
    await this.categorizationService.applyCategory(
      transactionId,
      applyCategoryDto.categoryId,
      user.organizationId,
      user.userId
    );

    return {
      success: true,
      message: 'Category applied successfully',
      transactionId,
      categoryId: applyCategoryDto.categoryId,
    };
  }

  @Post('apply/bulk')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Apply category to multiple transactions',
    description: 'Bulk apply a category to multiple transactions',
  })
  @ApiBody({ type: BulkApplyCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Category applied to transactions successfully',
  })
  async bulkApplyCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) bulkApplyDto: BulkApplyCategoryDto
  ) {
    const result = await this.categorizationService.bulkApplyCategory(
      bulkApplyDto.transactionIds,
      bulkApplyDto.categoryId,
      user.organizationId,
      user.userId
    );

    return {
      success: true,
      message: `Category applied to ${result.updated} transaction(s)`,
      updated: result.updated,
      categoryId: bulkApplyDto.categoryId,
    };
  }

  @Delete('remove/:transactionId')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'Remove category from transaction',
    description: 'Remove the assigned category from a transaction',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'Transaction ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Category removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async removeCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionId', ParseUUIDPipe) transactionId: string
  ) {
    await this.categorizationService.removeCategory(
      transactionId,
      user.organizationId,
      user.userId
    );

    return {
      success: true,
      message: 'Category removed successfully',
      transactionId,
    };
  }

  @Post('auto-categorize')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @ApiOperation({
    summary: 'Auto-categorize uncategorized transactions',
    description:
      'Automatically categorize all uncategorized transactions using AI and rules',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        transactionIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Specific transaction IDs to categorize (optional)',
        },
        autoApply: {
          type: 'boolean',
          description:
            'Whether to automatically apply high-confidence suggestions',
          default: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-categorization completed successfully',
    schema: {
      type: 'object',
      properties: {
        processed: { type: 'number' },
        categorized: { type: 'number' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              transactionId: { type: 'string' },
              suggestions: { type: 'array' },
              bestSuggestion: { type: 'object', nullable: true },
              isAutoApplied: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  async autoCategorizeTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { transactionIds?: string[]; autoApply?: boolean }
  ) {
    return await this.categorizationService.bulkCategorizeUncategorized({
      organizationId: user.organizationId,
      transactionIds: body.transactionIds,
      autoApply: body.autoApply ?? true,
    });
  }
}
