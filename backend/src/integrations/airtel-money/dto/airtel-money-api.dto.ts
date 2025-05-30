import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// ENUMS
// ============================================================================

export enum AirtelTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PAYMENT = 'PAYMENT',
  TRANSFER = 'TRANSFER',
  FEE = 'FEE',
  REFUND = 'REFUND',
}

export enum AirtelTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
}

export enum AirtelAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
}

export enum AirtelKycStatus {
  VERIFIED = 'VERIFIED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  NOT_STARTED = 'NOT_STARTED',
}

// ============================================================================
// REQUEST DTOs
// ============================================================================

export class ConnectAccountDto {
  @ApiProperty({
    description: 'Phone number for the Airtel Money account',
    example: '+260971234567',
  })
  @IsString()
  phoneNumber: string;
}

export class GetTransactionsDto {
  @ApiPropertyOptional({
    description: 'Number of transactions to return',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Number of transactions to skip',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Start date for transaction history (YYYY-MM-DD)',
    example: '2023-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for transaction history (YYYY-MM-DD)',
    example: '2023-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: AirtelTransactionType,
  })
  @IsOptional()
  @IsEnum(AirtelTransactionType)
  transactionType?: AirtelTransactionType;
}

export class TokenExchangeDto {
  @ApiProperty({
    description: 'Authorization code from OAuth callback',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'State parameter for CSRF protection',
  })
  @IsString()
  state: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token to exchange for new access token',
  })
  @IsString()
  refreshToken: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class AirtelApiStatusDto {
  @ApiProperty({ description: 'HTTP status code' })
  code: string;

  @ApiProperty({ description: 'Status message' })
  message: string;

  @ApiPropertyOptional({ description: 'Result code from Airtel' })
  result_code?: string;
}

export class AirtelApiErrorDto {
  @ApiProperty({ description: 'Error code' })
  error_code: string;

  @ApiProperty({ description: 'Error description' })
  error_description: string;
}

export class AirtelCounterpartyDto {
  @ApiPropertyOptional({ description: 'Counterparty name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Counterparty phone number' })
  msisdn?: string;
}

export class AirtelTransactionDto {
  @ApiProperty({ description: 'Unique transaction ID from Airtel' })
  transaction_id: string;

  @ApiPropertyOptional({ description: 'Transaction reference' })
  reference?: string;

  @ApiProperty({ description: 'Transaction date and time' })
  transaction_date: string;

  @ApiProperty({ description: 'Transaction amount' })
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({
    description: 'Transaction type',
    enum: AirtelTransactionType,
  })
  transaction_type: AirtelTransactionType;

  @ApiProperty({
    description: 'Transaction status',
    enum: AirtelTransactionStatus,
  })
  status: AirtelTransactionStatus;

  @ApiPropertyOptional({ description: 'Transaction description' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Counterparty information',
    type: AirtelCounterpartyDto,
  })
  @ValidateNested()
  @Type(() => AirtelCounterpartyDto)
  counterparty?: AirtelCounterpartyDto;

  @ApiPropertyOptional({ description: 'Account balance after transaction' })
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  balance_after?: number;

  @ApiPropertyOptional({ description: 'Transaction fees' })
  @Transform(({ value }) => (value ? parseFloat(value) : 0))
  fees?: number;
}

export class AirtelPaginationDto {
  @ApiProperty({ description: 'Total number of transactions' })
  total: number;

  @ApiProperty({ description: 'Number of transactions returned' })
  limit: number;

  @ApiProperty({ description: 'Number of transactions skipped' })
  offset: number;

  @ApiProperty({ description: 'Whether there are more transactions available' })
  has_more: boolean;
}

export class AirtelTransactionsResponseDto {
  @ApiProperty({
    description: 'Array of transactions',
    type: [AirtelTransactionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AirtelTransactionDto)
  transactions: AirtelTransactionDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: AirtelPaginationDto,
  })
  @ValidateNested()
  @Type(() => AirtelPaginationDto)
  pagination: AirtelPaginationDto;
}

export class AirtelAccountProfileDto {
  @ApiProperty({ description: 'Phone number' })
  msisdn: string;

  @ApiPropertyOptional({ description: 'First name' })
  first_name?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  last_name?: string;

  @ApiProperty({
    description: 'Account status',
    enum: AirtelAccountStatus,
  })
  status: AirtelAccountStatus;

  @ApiPropertyOptional({ description: 'Account grade/tier' })
  grade?: string;

  @ApiProperty({
    description: 'KYC verification status',
    enum: AirtelKycStatus,
  })
  kyc_status: AirtelKycStatus;
}

export class AirtelBalanceDto {
  @ApiProperty({ description: 'Phone number' })
  msisdn: string;

  @ApiProperty({ description: 'Account balance' })
  @Transform(({ value }) => parseFloat(value))
  balance: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;
}

export class AirtelTokenResponseDto {
  @ApiProperty({ description: 'Access token' })
  access_token: string;

  @ApiProperty({ description: 'Refresh token' })
  refresh_token: string;

  @ApiProperty({ description: 'Token type (Bearer)' })
  token_type: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expires_in: number;

  @ApiProperty({ description: 'Granted scopes' })
  scope: string;
}

// ============================================================================
// WRAPPER RESPONSE DTOs
// ============================================================================

export class AirtelApiResponseDto<T = any> {
  @ApiProperty({
    description: 'API status information',
    type: AirtelApiStatusDto,
  })
  @ValidateNested()
  @Type(() => AirtelApiStatusDto)
  status: AirtelApiStatusDto;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({
    description: 'Error information',
    type: AirtelApiErrorDto,
  })
  @ValidateNested()
  @Type(() => AirtelApiErrorDto)
  error?: AirtelApiErrorDto;
}

// ============================================================================
// INTERNAL DTOs
// ============================================================================

export class OAuthStateDto {
  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'User ID initiating the connection' })
  userId: string;

  @ApiProperty({ description: 'Phone number being connected' })
  phoneNumber: string;

  @ApiProperty({ description: 'Timestamp when state was created' })
  timestamp: number;

  @ApiProperty({ description: 'Random nonce for security' })
  nonce: string;
}

export class ConnectAccountResponseDto {
  @ApiProperty({ description: 'OAuth authorization URL' })
  authUrl: string;

  @ApiProperty({ description: 'State token for CSRF protection' })
  state: string;
}
