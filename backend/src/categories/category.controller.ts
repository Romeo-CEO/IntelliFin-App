import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryFiltersDto } from './dto/category.dto';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Create a new category',
    description: 'Create a new transaction category for the organization',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or category already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) createCategoryDto: CreateCategoryDto,
  ) {
    return await this.categoryService.createCategory({
      organizationId: user.organizationId,
      ...createCategoryDto,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get categories',
    description: 'Retrieve categories with optional filtering',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE'] })
  @ApiQuery({ name: 'parentId', required: false, type: 'string' })
  @ApiQuery({ name: 'isActive', required: false, type: 'boolean' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) filters: CategoryFiltersDto,
  ) {
    return await this.categoryService.getCategories({
      organizationId: user.organizationId,
      ...filters,
    });
  }

  @Get('hierarchy')
  @ApiOperation({
    summary: 'Get category hierarchy',
    description: 'Retrieve categories organized in a hierarchical structure',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE'] })
  @ApiResponse({
    status: 200,
    description: 'Category hierarchy retrieved successfully',
  })
  async getCategoryHierarchy(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: string,
  ) {
    return await this.categoryService.getCategoryHierarchy(
      user.organizationId,
      type as any,
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get categories with statistics',
    description: 'Retrieve categories with usage statistics and transaction counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Category statistics retrieved successfully',
  })
  async getCategoriesWithStats(@CurrentUser() user: AuthenticatedUser) {
    return await this.categoryService.getCategoriesWithStats(user.organizationId);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get category analytics',
    description: 'Retrieve comprehensive analytics about category usage and performance',
  })
  @ApiQuery({ name: 'startDate', required: false, type: 'string', format: 'date' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string', format: 'date' })
  @ApiResponse({
    status: 200,
    description: 'Category analytics retrieved successfully',
  })
  async getCategoryAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.categoryService.getCategoryAnalytics(
      user.organizationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get category suggestions',
    description: 'Get AI-powered category suggestions for uncategorized transactions',
  })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Category suggestions retrieved successfully',
  })
  async getCategorySuggestions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    return await this.categoryService.suggestCategoriesForUncategorized(
      user.organizationId,
      limit ? parseInt(limit.toString()) : 50,
    );
  }

  @Post('auto-categorize')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Auto-categorize transactions',
    description: 'Automatically categorize uncategorized transactions using AI',
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
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-categorization completed successfully',
  })
  async autoCategorizeTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { transactionIds?: string[] },
  ) {
    return await this.categoryService.autoCategorizeTransactions(
      user.organizationId,
      body.transactionIds,
    );
  }

  @Post('initialize-defaults')
  @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 request per minute
  @ApiOperation({
    summary: 'Initialize default categories',
    description: 'Create default categories for the organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Default categories initialized successfully',
  })
  async initializeDefaultCategories(@CurrentUser() user: AuthenticatedUser) {
    return await this.categoryService.initializeDefaultCategories(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Retrieve a specific category by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async getCategoryById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.categoryService.getCategoryById(id, user.organizationId);
  }

  @Put(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Update category',
    description: 'Update an existing category',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateCategoryDto: UpdateCategoryDto,
  ) {
    return await this.categoryService.updateCategory(
      id,
      user.organizationId,
      updateCategoryDto,
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Delete category',
    description: 'Delete a category (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete category with children or transactions',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async deleteCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.categoryService.deleteCategory(id, user.organizationId);
    return { success: true, message: 'Category deleted successfully' };
  }
}
