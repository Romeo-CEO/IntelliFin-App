import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

import { CategoryService } from './category.service';
import {
  CategoryAnalytics,
  CategoryFiltersDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';
import { Category } from '@prisma/client';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden' })
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new category',
    description: 'Create a new transaction category for the organization',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({
    description: 'The category has been successfully created',
    type: Category,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or category with the same name already exists',
  })
  @ApiConflictResponse({
    description: 'A category with this name already exists',
  })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<Category> {
    return this.categoryService.createCategory({
      ...createCategoryDto,
      organizationId: user.organizationId,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Retrieve all categories with optional filtering',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: CategoryType,
    description: 'Filter by category type',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Filter by parent category ID',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or description',
  })
  @ApiOkResponse({
    description: 'Categories retrieved successfully',
    type: [Category],
  })
  async findAll(
    @Query() filters: CategoryFiltersDto,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<Category[]> {
    return this.categoryService.getCategories({
      ...filters,
      organizationId: user.organizationId,
    });
  }

  @Get('hierarchy')
  @ApiOperation({
    summary: 'Get category hierarchy',
    description: 'Get categories organized in a hierarchical structure',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: CategoryType,
    description: 'Filter by category type',
  })
  @ApiOkResponse({
    description: 'Category hierarchy retrieved successfully',
    type: Object,
  })
  async getHierarchy(
    @Query('type') type: CategoryType,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.categoryService.getCategoryHierarchy(user.organizationId, type);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get category analytics',
    description: 'Get statistics and analytics about category usage',
  })
  @ApiOkResponse({
    description: 'Category analytics retrieved successfully',
    type: Object,
  })
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser
  ): Promise<CategoryAnalytics> {
    return this.categoryService.getCategoryAnalytics(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Retrieve a specific category by its ID',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiOkResponse({
    description: 'Category retrieved successfully',
    type: Category,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<Category> {
    return this.categoryService.getCategoryById(id, user.organizationId);
  }

  @Get(':id/path')
  @ApiOperation({
    summary: 'Get category path',
    description: 'Get the full path from the root to the specified category',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiOkResponse({
    description: 'Category path retrieved successfully',
    type: [Category],
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({
    description: 'Invalid category hierarchy',
  })
  async getPath(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<Category[]> {
    return this.categoryService.getCategoryPath(id, user.organizationId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a category',
    description: 'Update an existing category',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiOkResponse({
    description: 'Category updated successfully',
    type: Category,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({
    description: 'Invalid input or circular dependency detected',
  })
  @ApiConflictResponse({
    description: 'A category with this name already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<Category> {
    return this.categoryService.updateCategory(
      id,
      user.organizationId,
      updateCategoryDto
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a category',
    description: 'Delete a category by ID',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 204,
    description: 'Category deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({
    description: 'Cannot delete category with children or in use by transactions',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.categoryService.deleteCategory(id, user.organizationId);
  }

  @Post(':id/recategorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recategorize transactions',
    description: 'Re-apply categorization rules to transactions in this category',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiOkResponse({
    description: 'Recategorization completed',
    schema: {
      type: 'object',
      properties: {
        recategorized: { type: 'number', description: 'Number of transactions recategorized' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async recategorizeTransactions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<{ recategorized: number }> {
    return this.categoryService.recategorizeTransactions(
      id,
      user.organizationId
    );
  }

  @Get('name/available')
  @ApiOperation({
    summary: 'Check category name availability',
    description: 'Check if a category name is available within an organization',
  })
  @ApiQuery({ name: 'name', required: true, type: String })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  @ApiQuery({ name: 'excludeId', required: false, type: String })
  @ApiOkResponse({
    description: 'Name availability check result',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
      },
    },
  })
  async checkNameAvailability(
    @Query('name') name: string,
    @Query('parentId') parentId: string | undefined,
    @Query('excludeId') excludeId: string | undefined,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<{ available: boolean }> {
    const available = await this.categoryService.isCategoryNameAvailable(
      user.organizationId,
      name,
      parentId || null,
      excludeId
    );
    return { available };
  }
}
