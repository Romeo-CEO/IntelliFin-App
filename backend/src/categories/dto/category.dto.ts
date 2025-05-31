import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
  IsNumber,
  IsArray,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Office Supplies',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  @Matches(/^[\w\s\-&]+$/, {
    message: 'Name can only contain letters, numbers, spaces, hyphens, and ampersands',
  })
  name: string;

  @ApiProperty({
    description: 'Category type',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({
    description: 'Parent category ID for hierarchical organization',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Expenses for office supplies and stationery',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Category color (hex code)',
    example: '#3B82F6',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color code (e.g., #3B82F6)',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Category icon name',
    example: 'Package',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'Icon name can only contain letters, numbers, and hyphens',
  })
  icon?: string;

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Office Supplies',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/^[\w\s\-&]+$/, {
    message: 'Name can only contain letters, numbers, spaces, hyphens, and ampersands',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Category type',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @ApiPropertyOptional({
    description: 'Parent category ID (set to null to make it a root category)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Expenses for office supplies and stationery',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Category color (hex code)',
    example: '#3B82F6',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color code (e.g., #3B82F6)',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Category icon name',
    example: 'Package',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'Icon name can only contain letters, numbers, and hyphens',
  })
  icon?: string;

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CategoryFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by category type',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @ApiPropertyOptional({
    description: 'Filter by parent category ID (use null for root categories)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search term for category name or description',
    example: 'office',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  search?: string;
}

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Office Supplies',
  })
  name: string;

  @ApiProperty({
    description: 'Category type',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  type: CategoryType;

  @ApiProperty({
    description: 'Parent category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({
    description: 'Category description',
    example: 'Expenses for office supplies and stationery',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Category color',
    example: '#3B82F6',
    nullable: true,
  })
  color: string | null;

  @ApiProperty({
    description: 'Category icon',
    example: 'Package',
    nullable: true,
  })
  icon: string | null;

  @ApiProperty({
    description: 'Whether the category is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  updatedAt: Date;
}

export class CategoryWithStatsDto extends CategoryResponseDto {
  @ApiProperty({
    description: 'Number of transactions in this category',
    example: 25,
  })
  transactionCount: number;

  @ApiProperty({
    description: 'Total amount of transactions in this category',
    example: 1500.5,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Number of child categories',
    example: 3,
  })
  childrenCount: number;

  @ApiProperty({
    description: 'Last time this category was used',
    example: '2023-12-01T10:00:00Z',
    nullable: true,
  })
  lastUsed: Date | null;
}

export class CategoryHierarchyDto extends CategoryResponseDto {
  @ApiProperty({
    description: 'Child categories',
    type: () => [CategoryHierarchyDto],
  })
  @Type(() => CategoryHierarchyDto)
  children: CategoryHierarchyDto[];

  @ApiProperty({
    description: 'Hierarchy level (0 = root)',
    example: 0,
  })
  level: number;

  @ApiProperty({
    description: 'Category path from root',
    example: ['Expenses', 'Office', 'Supplies'],
  })
  path: string[];

  @ApiPropertyOptional({
    description: 'Number of transactions in this category',
    example: 25,
  })
  transactionCount?: number;

  @ApiPropertyOptional({
    description: 'Total amount of transactions in this category',
    example: 1500.5,
  })
  totalAmount?: number;
}

export class CategoryAnalyticsDto {
  @ApiProperty({
    description: 'Total number of categories',
    example: 15,
  })
  totalCategories: number;

  @ApiProperty({
    description: 'Number of categories by type',
    example: { INCOME: 5, EXPENSE: 10 },
  })
  categoriesByType: Record<CategoryType, number>;

  @ApiProperty({
    description: 'Number of categorized transactions',
    example: 150,
  })
  categorizedTransactions: number;

  @ApiProperty({
    description: 'Number of uncategorized transactions',
    example: 25,
  })
  uncategorizedTransactions: number;

  @ApiProperty({
    description: 'Top categories by usage',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string', enum: Object.values(CategoryType) },
        transactionCount: { type: 'number' },
        totalAmount: { type: 'number' },
        percentage: { type: 'number' },
      },
    },
  })
  topCategories: Array<{
    id: string;
    name: string;
    type: CategoryType;
    transactionCount: number;
    totalAmount: number;
    percentage: number;
  }>;

  @ApiProperty({
    description: 'Category usage over time',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        categorized: { type: 'number' },
        uncategorized: { type: 'number' },
      },
    },
  })
  categoryUsageOverTime: Array<{
    date: string;
    categorized: number;
    uncategorized: number;
  }>;
}

export class RecategorizeResponseDto {
  @ApiProperty({
    description: 'Number of transactions that were recategorized',
    example: 15,
  })
  recategorized: number;
}

export class NameAvailabilityResponseDto {
  @ApiProperty({
    description: 'Whether the category name is available',
    example: true,
  })
  available: boolean;
}

export class CategoryUsageOverTimeDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2023-12-01',
  })
  date: string;

  @ApiProperty({
    description: 'Number of categorized transactions on this date',
    example: 10,
  })
  categorized: number;

  @ApiProperty({
    description: 'Number of uncategorized transactions on this date',
    example: 2,
  })
  uncategorized: number;
}
