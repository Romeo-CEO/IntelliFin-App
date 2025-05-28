import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsUrl, 
  IsPhoneNumber,
  IsEnum,
  IsHexColor,
  IsInt,
  Min,
  Max,
  Length,
  Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsValidZraTin, IsCompanyZraTin } from '../validators/zra-tin.validator';

// Zambian business types based on Companies Act
export enum ZambianBusinessType {
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  PARTNERSHIP = 'PARTNERSHIP',
  LIMITED_LIABILITY_COMPANY = 'LIMITED_LIABILITY_COMPANY',
  PUBLIC_LIMITED_COMPANY = 'PUBLIC_LIMITED_COMPANY',
  COOPERATIVE = 'COOPERATIVE',
  NGO = 'NGO',
  TRUST = 'TRUST',
  BRANCH_OFFICE = 'BRANCH_OFFICE',
  REPRESENTATIVE_OFFICE = 'REPRESENTATIVE_OFFICE',
}

// Zambian industries based on ISIC classification
export enum ZambianIndustry {
  AGRICULTURE = 'AGRICULTURE',
  MINING = 'MINING',
  MANUFACTURING = 'MANUFACTURING',
  CONSTRUCTION = 'CONSTRUCTION',
  WHOLESALE_RETAIL = 'WHOLESALE_RETAIL',
  TRANSPORT_LOGISTICS = 'TRANSPORT_LOGISTICS',
  ACCOMMODATION_FOOD = 'ACCOMMODATION_FOOD',
  INFORMATION_COMMUNICATION = 'INFORMATION_COMMUNICATION',
  FINANCIAL_INSURANCE = 'FINANCIAL_INSURANCE',
  REAL_ESTATE = 'REAL_ESTATE',
  PROFESSIONAL_SERVICES = 'PROFESSIONAL_SERVICES',
  EDUCATION = 'EDUCATION',
  HEALTH_SOCIAL = 'HEALTH_SOCIAL',
  ARTS_ENTERTAINMENT = 'ARTS_ENTERTAINMENT',
  OTHER_SERVICES = 'OTHER_SERVICES',
}

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Lusaka Trading Company Ltd',
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255, { message: 'Organization name must be between 2 and 255 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Business type according to Zambian law',
    enum: ZambianBusinessType,
    example: ZambianBusinessType.LIMITED_LIABILITY_COMPANY,
  })
  @IsEnum(ZambianBusinessType, { 
    message: 'Business type must be a valid Zambian business type' 
  })
  businessType: ZambianBusinessType;

  @ApiProperty({
    description: 'ZRA Tax Identification Number (10 digits)',
    example: '4567890123',
    pattern: '^\\d{10}$',
  })
  @IsCompanyZraTin()
  @Transform(({ value }) => value?.replace(/[\s-]/g, ''))
  zraTin: string;

  @ApiPropertyOptional({
    description: 'Business address',
    example: 'Plot 123, Cairo Road, Lusaka',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Address must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Lusaka',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'City must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({
    description: 'Country (defaults to Zambia)',
    example: 'Zambia',
    default: 'Zambia',
  })
  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'Country must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim() || 'Zambia')
  country?: string = 'Zambia';

  @ApiPropertyOptional({
    description: 'Phone number in international format',
    example: '+260977123456',
  })
  @IsOptional()
  @IsPhoneNumber('ZM', { message: 'Phone number must be a valid Zambian phone number' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Business email address',
    example: 'info@lusakatrading.co.zm',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({
    description: 'Business website URL',
    example: 'https://www.lusakatrading.co.zm',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Industry sector',
    enum: ZambianIndustry,
    example: ZambianIndustry.WHOLESALE_RETAIL,
  })
  @IsOptional()
  @IsEnum(ZambianIndustry, { 
    message: 'Industry must be a valid industry type' 
  })
  industry?: ZambianIndustry;

  @ApiPropertyOptional({
    description: 'Bank name',
    example: 'Zanaco Bank',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'Bank name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Bank account number',
    example: '1234567890',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(0, 50, { message: 'Bank account number must not exceed 50 characters' })
  @Matches(/^[0-9A-Za-z\-\s]*$/, { 
    message: 'Bank account number can only contain letters, numbers, hyphens, and spaces' 
  })
  @Transform(({ value }) => value?.trim())
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    description: 'Bank branch',
    example: 'Cairo Road Branch',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'Bank branch must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  bankBranch?: string;

  @ApiPropertyOptional({
    description: 'Default currency (ISO 4217 code)',
    example: 'ZMW',
    default: 'ZMW',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Currency must be a 3-letter ISO code' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be a valid 3-letter ISO code' })
  @Transform(({ value }) => value?.toUpperCase() || 'ZMW')
  defaultCurrency?: string = 'ZMW';

  @ApiPropertyOptional({
    description: 'Fiscal year start month (1-12)',
    example: 1,
    minimum: 1,
    maximum: 12,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Fiscal year start must be an integer' })
  @Min(1, { message: 'Fiscal year start must be between 1 and 12' })
  @Max(12, { message: 'Fiscal year start must be between 1 and 12' })
  fiscalYearStart?: number = 1;

  @ApiPropertyOptional({
    description: 'Primary brand color (hex code)',
    example: '#005FAD',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsHexColor({ message: 'Primary color must be a valid hex color code' })
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Secondary brand color (hex code)',
    example: '#00A99D',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsHexColor({ message: 'Secondary color must be a valid hex color code' })
  secondaryColor?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Organization name',
    example: 'Lusaka Trading Company Ltd',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(2, 255, { message: 'Organization name must be between 2 and 255 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'Business type according to Zambian law',
    enum: ZambianBusinessType,
    example: ZambianBusinessType.LIMITED_LIABILITY_COMPANY,
  })
  @IsOptional()
  @IsEnum(ZambianBusinessType, { 
    message: 'Business type must be a valid Zambian business type' 
  })
  businessType?: ZambianBusinessType;

  // Include other optional fields from CreateOrganizationDto
  // (excluding zraTin as it shouldn't be updated after creation)
  
  @ApiPropertyOptional({
    description: 'Business address',
    example: 'Plot 123, Cairo Road, Lusaka',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Address must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Lusaka',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'City must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({
    description: 'Phone number in international format',
    example: '+260977123456',
  })
  @IsOptional()
  @IsPhoneNumber('ZM', { message: 'Phone number must be a valid Zambian phone number' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Business email address',
    example: 'info@lusakatrading.co.zm',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({
    description: 'Business website URL',
    example: 'https://www.lusakatrading.co.zm',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Industry sector',
    enum: ZambianIndustry,
    example: ZambianIndustry.WHOLESALE_RETAIL,
  })
  @IsOptional()
  @IsEnum(ZambianIndustry, { 
    message: 'Industry must be a valid industry type' 
  })
  industry?: ZambianIndustry;
}

export class OrganizationResponseDto {
  @ApiProperty({ description: 'Organization ID' })
  id: string;

  @ApiProperty({ description: 'Organization name' })
  name: string;

  @ApiProperty({ description: 'Business type', enum: ZambianBusinessType })
  businessType: ZambianBusinessType;

  @ApiProperty({ description: 'ZRA Tax Identification Number' })
  zraTin: string;

  @ApiPropertyOptional({ description: 'Business address' })
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  city?: string;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'Industry', enum: ZambianIndustry })
  industry?: ZambianIndustry;

  @ApiProperty({ description: 'Default currency' })
  defaultCurrency: string;

  @ApiProperty({ description: 'Fiscal year start month' })
  fiscalYearStart: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
