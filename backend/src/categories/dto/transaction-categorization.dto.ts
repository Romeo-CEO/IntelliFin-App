import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategorizeTransactionDto {
  @ApiPropertyOptional({
    description: 'Whether to automatically apply high-confidence suggestions',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;
}

export class BulkCategorizeDto {
  @ApiProperty({
    description: 'Array of transaction IDs to categorize',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID(4, { each: true })
  transactionIds: string[];

  @ApiPropertyOptional({
    description: 'Whether to automatically apply high-confidence suggestions',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;
}

export class ApplyCategoryDto {
  @ApiProperty({
    description: 'Category ID to apply to the transaction',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  categoryId: string;
}

export class BulkApplyCategoryDto {
  @ApiProperty({
    description: 'Array of transaction IDs to apply category to',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID(4, { each: true })
  transactionIds: string[];

  @ApiProperty({
    description: 'Category ID to apply to all transactions',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  categoryId: string;
}

export class CategorySuggestionDto {
  @ApiProperty({
    description: 'Suggested category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Suggested category name',
    example: 'Office Supplies',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Confidence level of the suggestion',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
    example: 'HIGH',
  })
  confidence: string;

  @ApiProperty({
    description: 'Reason for the suggestion',
    example: 'Matched keywords: office, supplies',
  })
  reason: string;

  @ApiPropertyOptional({
    description: 'Rule ID that generated this suggestion',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  ruleId?: string;

  @ApiPropertyOptional({
    description: 'Rule name that generated this suggestion',
    example: 'Office Supplies Keyword Rule',
  })
  ruleName?: string;

  @ApiProperty({
    description: 'Confidence score (0-100)',
    example: 85,
  })
  score: number;
}

export class CategorizationResultDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Array of category suggestions',
    type: [CategorySuggestionDto],
  })
  suggestions: CategorySuggestionDto[];

  @ApiPropertyOptional({
    description: 'Best suggestion (highest confidence)',
    type: CategorySuggestionDto,
  })
  bestSuggestion?: CategorySuggestionDto;

  @ApiProperty({
    description: 'Whether the best suggestion was automatically applied',
    example: false,
  })
  isAutoApplied: boolean;
}

export class BulkCategorizationResultDto {
  @ApiProperty({
    description: 'Number of transactions processed',
    example: 50,
  })
  processed: number;

  @ApiProperty({
    description: 'Number of transactions automatically categorized',
    example: 35,
  })
  categorized: number;

  @ApiProperty({
    description: 'Detailed results for each transaction',
    type: [CategorizationResultDto],
  })
  results: CategorizationResultDto[];
}

export class ApplyCategoryResultDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Category applied successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Applied category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  categoryId: string;
}

export class BulkApplyCategoryResultDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Category applied to 25 transaction(s)',
  })
  message: string;

  @ApiProperty({
    description: 'Number of transactions updated',
    example: 25,
  })
  updated: number;

  @ApiProperty({
    description: 'Applied category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  categoryId: string;
}

export class RemoveCategoryResultDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Category removed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  transactionId: string;
}
