import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDecimal,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsIn,
  ValidateNested,
  IsUrl,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({
    description: 'Stock Keeping Unit (SKU) - unique identifier',
    example: 'SKU-001-2024',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'SKU must be at least 3 characters long' })
  @MaxLength(100, { message: 'SKU cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  sku: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Premium Office Chair',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2, { message: 'Product name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Product name cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Ergonomic office chair with lumbar support and adjustable height',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Product category',
    example: 'Office Furniture',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Category cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  category?: string;

  @ApiPropertyOptional({
    description: 'Product brand',
    example: 'ErgoMax',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Brand cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  brand?: string;

  @ApiPropertyOptional({
    description: 'Product barcode',
    example: '1234567890123',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Barcode cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  barcode?: string;

  @ApiPropertyOptional({
    description: 'QR code for the product',
    example: 'QR123456789',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'QR code cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  qrCode?: string;

  @ApiPropertyOptional({
    description: 'ZRA item classification code',
    example: 'ZRA-FURN-001',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'ZRA item code cannot exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  zraItemCode?: string;

  @ApiProperty({
    description: 'Cost price of the product',
    example: 150.00,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Cost price must be a valid decimal with up to 2 decimal places' })
  @Min(0, { message: 'Cost price must be non-negative' })
  @Type(() => Number)
  costPrice: number;

  @ApiProperty({
    description: 'Selling price of the product',
    example: 250.00,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Selling price must be a valid decimal with up to 2 decimal places' })
  @Min(0, { message: 'Selling price must be non-negative' })
  @Type(() => Number)
  sellingPrice: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'ZMW',
    default: 'ZMW',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ZMW', 'USD', 'EUR', 'GBP'], { message: 'Currency must be one of: ZMW, USD, EUR, GBP' })
  @Transform(({ value }) => value?.toUpperCase() || 'ZMW')
  currency?: string;

  @ApiPropertyOptional({
    description: 'VAT rate percentage',
    example: 16,
    minimum: 0,
    maximum: 100,
    default: 16,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'VAT rate must be a valid decimal' })
  @Min(0, { message: 'VAT rate must be non-negative' })
  @Max(100, { message: 'VAT rate cannot exceed 100%' })
  @Type(() => Number)
  vatRate?: number;

  @ApiPropertyOptional({
    description: 'Whether the product is taxable',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTaxable?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum stock level',
    example: 10,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Minimum stock must be a valid decimal' })
  @Min(0, { message: 'Minimum stock must be non-negative' })
  @Type(() => Number)
  minimumStock?: number;

  @ApiPropertyOptional({
    description: 'Maximum stock level',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Maximum stock must be a valid decimal' })
  @Min(0, { message: 'Maximum stock must be non-negative' })
  @Type(() => Number)
  maximumStock?: number;

  @ApiPropertyOptional({
    description: 'Reorder point',
    example: 20,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Reorder point must be a valid decimal' })
  @Min(0, { message: 'Reorder point must be non-negative' })
  @Type(() => Number)
  reorderPoint?: number;

  @ApiPropertyOptional({
    description: 'Reorder quantity',
    example: 50,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Reorder quantity must be a valid decimal' })
  @Min(0, { message: 'Reorder quantity must be non-negative' })
  @Type(() => Number)
  reorderQuantity?: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement',
    example: 'pcs',
    default: 'pcs',
  })
  @IsOptional()
  @IsString()
  @IsIn(['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'mm', 'box', 'pack', 'set'], {
    message: 'Unit must be one of: pcs, kg, g, l, ml, m, cm, mm, box, pack, set'
  })
  @Transform(({ value }) => value?.toLowerCase() || 'pcs')
  unit?: string;

  @ApiPropertyOptional({
    description: 'Product weight in kg',
    example: 15.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Weight must be a valid decimal' })
  @Min(0, { message: 'Weight must be non-negative' })
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({
    description: 'Product dimensions (length, width, height)',
    example: { length: 120, width: 60, height: 90 },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };

  @ApiPropertyOptional({
    description: 'Whether the product is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is a service (vs physical product)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isService?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to track stock for this product',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  trackStock?: boolean;

  @ApiPropertyOptional({
    description: 'Product image URLs',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images?: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Premium Office Chair - Updated',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Product name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Product name cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;
}

export class ProductQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'name',
    enum: ['name', 'sku', 'category', 'costPrice', 'sellingPrice', 'currentStock', 'createdAt'],
    default: 'name',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'sku', 'category', 'costPrice', 'sellingPrice', 'currentStock', 'createdAt'])
  sortBy?: string = 'name';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({
    description: 'Search term for product name, SKU, or description',
    example: 'office chair',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Search term cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Office Furniture',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Category cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by brand',
    example: 'ErgoMax',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Brand cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  brand?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by service type',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isService?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by stock tracking',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  trackStock?: boolean;

  @ApiPropertyOptional({
    description: 'Filter products with low stock',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lowStock?: boolean;

  @ApiPropertyOptional({
    description: 'Filter products with zero stock',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  outOfStock?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum cost price filter',
    example: 50.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Minimum cost price must be a valid decimal' })
  @Min(0, { message: 'Minimum cost price must be non-negative' })
  @Type(() => Number)
  minCostPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum cost price filter',
    example: 500.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Maximum cost price must be a valid decimal' })
  @Min(0, { message: 'Maximum cost price must be non-negative' })
  @Type(() => Number)
  maxCostPrice?: number;
}

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Stock Keeping Unit (SKU)',
    example: 'SKU-001-2024',
  })
  sku: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Premium Office Chair',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Ergonomic office chair with lumbar support',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Product category',
    example: 'Office Furniture',
  })
  category?: string;

  @ApiPropertyOptional({
    description: 'Product brand',
    example: 'ErgoMax',
  })
  brand?: string;

  @ApiPropertyOptional({
    description: 'Product barcode',
    example: '1234567890123',
  })
  barcode?: string;

  @ApiPropertyOptional({
    description: 'QR code',
    example: 'QR123456789',
  })
  qrCode?: string;

  @ApiPropertyOptional({
    description: 'ZRA item code',
    example: 'ZRA-FURN-001',
  })
  zraItemCode?: string;

  @ApiProperty({
    description: 'Cost price',
    example: 150.00,
  })
  costPrice: number;

  @ApiProperty({
    description: 'Selling price',
    example: 250.00,
  })
  sellingPrice: number;

  @ApiProperty({
    description: 'Currency',
    example: 'ZMW',
  })
  currency: string;

  @ApiProperty({
    description: 'VAT rate percentage',
    example: 16,
  })
  vatRate: number;

  @ApiProperty({
    description: 'Whether the product is taxable',
    example: true,
  })
  isTaxable: boolean;

  @ApiProperty({
    description: 'Current stock level',
    example: 45,
  })
  currentStock: number;

  @ApiProperty({
    description: 'Minimum stock level',
    example: 10,
  })
  minimumStock: number;

  @ApiPropertyOptional({
    description: 'Maximum stock level',
    example: 1000,
  })
  maximumStock?: number;

  @ApiProperty({
    description: 'Reorder point',
    example: 20,
  })
  reorderPoint: number;

  @ApiProperty({
    description: 'Reorder quantity',
    example: 50,
  })
  reorderQuantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'pcs',
  })
  unit: string;

  @ApiPropertyOptional({
    description: 'Weight in kg',
    example: 15.5,
  })
  weight?: number;

  @ApiPropertyOptional({
    description: 'Product dimensions',
    example: { length: 120, width: 60, height: 90 },
  })
  dimensions?: object;

  @ApiProperty({
    description: 'Whether the product is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether this is a service',
    example: false,
  })
  isService: boolean;

  @ApiProperty({
    description: 'Whether to track stock',
    example: true,
  })
  trackStock: boolean;

  @ApiPropertyOptional({
    description: 'Product images',
    example: ['https://example.com/image1.jpg'],
  })
  images?: string[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

export class ProductListResponseDto {
  @ApiProperty({
    description: 'List of products',
    type: [ProductResponseDto],
  })
  products: ProductResponseDto[];

  @ApiProperty({
    description: 'Total number of products',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;
}

export class ProductStatsDto {
  @ApiProperty({
    description: 'Total number of products',
    example: 150,
  })
  totalProducts: number;

  @ApiProperty({
    description: 'Number of active products',
    example: 145,
  })
  activeProducts: number;

  @ApiProperty({
    description: 'Number of products with low stock',
    example: 12,
  })
  lowStockProducts: number;

  @ApiProperty({
    description: 'Number of out of stock products',
    example: 3,
  })
  outOfStockProducts: number;

  @ApiProperty({
    description: 'Total inventory value',
    example: 125000.50,
  })
  totalInventoryValue: number;

  @ApiProperty({
    description: 'Number of product categories',
    example: 8,
  })
  totalCategories: number;
}
