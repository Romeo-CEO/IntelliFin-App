import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { JournalEntryType, SourceType } from '@prisma/client';

export class CreateJournalEntryLineDto {
  @ApiPropertyOptional({
    description: 'Account code (alternative to accountId)',
  })
  @IsOptional()
  @IsString()
  accountCode?: string;

  @ApiPropertyOptional({
    description: 'Account ID (alternative to accountCode)',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Debit amount (mutually exclusive with creditAmount)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  debitAmount?: number;

  @ApiPropertyOptional({
    description: 'Credit amount (mutually exclusive with debitAmount)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditAmount?: number;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Line reference' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty({ description: 'Entry date' })
  @IsDateString()
  entryDate: Date;

  @ApiProperty({ description: 'Entry description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Entry reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Entry type', enum: JournalEntryType })
  @IsEnum(JournalEntryType)
  entryType: JournalEntryType;

  @ApiPropertyOptional({ description: 'Source type', enum: SourceType })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiPropertyOptional({ description: 'Source ID' })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiProperty({
    description: 'Journal entry lines',
    type: [CreateJournalEntryLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines: CreateJournalEntryLineDto[];
}

export class UpdateJournalEntryLineDto {
  @ApiPropertyOptional({ description: 'Debit account ID' })
  @IsOptional()
  @IsUUID()
  debitAccountId?: string;

  @ApiPropertyOptional({ description: 'Credit account ID' })
  @IsOptional()
  @IsUUID()
  creditAccountId?: string;

  @ApiProperty({ description: 'Line amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Line reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Line number' })
  @IsNumber()
  @Min(1)
  lineNumber: number;
}

export class UpdateJournalEntryDto {
  @ApiPropertyOptional({ description: 'Entry date' })
  @IsOptional()
  @IsDateString()
  entryDate?: Date;

  @ApiPropertyOptional({ description: 'Entry description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Entry reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Entry type', enum: JournalEntryType })
  @IsOptional()
  @IsEnum(JournalEntryType)
  entryType?: JournalEntryType;

  @ApiPropertyOptional({
    description: 'Journal entry lines',
    type: [UpdateJournalEntryLineDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateJournalEntryLineDto)
  lines?: UpdateJournalEntryLineDto[];
}

export class JournalEntryQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by entry type',
    enum: JournalEntryType,
  })
  @IsOptional()
  @IsEnum(JournalEntryType)
  entryType?: JournalEntryType;

  @ApiPropertyOptional({
    description: 'Filter by source type',
    enum: SourceType,
  })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiPropertyOptional({ description: 'Filter by source ID' })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({ description: 'Filter by posted status' })
  @IsOptional()
  @IsBoolean()
  isPosted?: boolean;

  @ApiPropertyOptional({ description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  dateTo?: Date;

  @ApiPropertyOptional({
    description: 'Search in entry number, description, or reference',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class ReverseJournalEntryDto {
  @ApiProperty({ description: 'Reversal date' })
  @IsDateString()
  reversalDate: Date;

  @ApiProperty({ description: 'Reason for reversal' })
  @IsString()
  reversalReason: string;
}

export class JournalEntryLineResponseDto {
  @ApiProperty({ description: 'Line ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Debit account ID' })
  debitAccountId?: string;

  @ApiPropertyOptional({ description: 'Credit account ID' })
  creditAccountId?: string;

  @ApiProperty({ description: 'Line amount' })
  amount: number;

  @ApiPropertyOptional({ description: 'Line description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Line reference' })
  reference?: string;

  @ApiProperty({ description: 'Line number' })
  lineNumber: number;

  @ApiPropertyOptional({ description: 'Debit account details' })
  debitAccount?: {
    accountCode: string;
    accountName: string;
  };

  @ApiPropertyOptional({ description: 'Credit account details' })
  creditAccount?: {
    accountCode: string;
    accountName: string;
  };
}

export class JournalEntryResponseDto {
  @ApiProperty({ description: 'Journal entry ID' })
  id: string;

  @ApiProperty({ description: 'Entry number' })
  entryNumber: string;

  @ApiProperty({ description: 'Entry date' })
  entryDate: Date;

  @ApiProperty({ description: 'Entry description' })
  description: string;

  @ApiPropertyOptional({ description: 'Entry reference' })
  reference?: string;

  @ApiProperty({ description: 'Entry type', enum: JournalEntryType })
  entryType: JournalEntryType;

  @ApiProperty({ description: 'Whether entry is reversing another entry' })
  isReversing: boolean;

  @ApiPropertyOptional({ description: 'ID of reversed entry' })
  reversedEntryId?: string;

  @ApiProperty({ description: 'Whether entry is posted' })
  isPosted: boolean;

  @ApiPropertyOptional({ description: 'Posted date' })
  postedAt?: Date;

  @ApiPropertyOptional({ description: 'Posted by user ID' })
  postedBy?: string;

  @ApiPropertyOptional({ description: 'Source type', enum: SourceType })
  sourceType?: SourceType;

  @ApiPropertyOptional({ description: 'Source ID' })
  sourceId?: string;

  @ApiProperty({ description: 'Total debit amount' })
  totalDebit: number;

  @ApiProperty({ description: 'Total credit amount' })
  totalCredit: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Journal entry lines',
    type: [JournalEntryLineResponseDto],
  })
  lines: JournalEntryLineResponseDto[];
}
