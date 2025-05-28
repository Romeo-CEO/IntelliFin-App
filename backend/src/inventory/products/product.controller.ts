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
  ValidationPipe,
  ParseUUIDPipe,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { UserRole } from '@prisma/client';
import { ProductService } from './product.service';
import { OrganizationResolverService } from '../services/organization-resolver.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductResponseDto,
  ProductListResponseDto,
  ProductStatsDto,
} from './dto/product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory/products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly organizationResolver: OrganizationResolverService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Create a new product in the inventory system',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Product with SKU or barcode already exists',
  })
  async createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body(ValidationPipe) createProductDto: CreateProductDto,
  ) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.createProduct(organizationId, createProductDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get products',
    description: 'Get a paginated list of products with optional filters',
  })
  @ApiQuery({ type: ProductQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
    type: ProductListResponseDto,
  })
  async getProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Query(ValidationPipe) query: ProductQueryDto,
  ) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.getProducts(organizationId, query);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get product statistics',
    description: 'Get comprehensive statistics about products and inventory',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product statistics retrieved successfully',
    type: ProductStatsDto,
  })
  async getProductStats(@CurrentUser() user: AuthenticatedUser) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.getProductStats(organizationId);
  }

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Search products',
    description: 'Search products by name, SKU, or barcode',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search term',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: [ProductResponseDto],
  })
  async searchProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number,
  ) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.searchProducts(
      organizationId,
      searchTerm,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('select')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get products for select dropdown',
    description: 'Get simplified product list for dropdown/select components',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products for select retrieved successfully',
  })
  async getProductsForSelect(@CurrentUser() user: AuthenticatedUser) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.getProductsForSelect(organizationId);
  }

  @Get('low-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get low stock products',
    description: 'Get products with stock levels below minimum threshold',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Low stock products retrieved successfully',
    type: [ProductResponseDto],
  })
  async getLowStockProducts(@CurrentUser() user: AuthenticatedUser) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.getLowStockProducts(organizationId);
  }

  @Get('out-of-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get out of stock products',
    description: 'Get products with zero stock levels',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Out of stock products retrieved successfully',
    type: [ProductResponseDto],
  })
  async getOutOfStockProducts(@CurrentUser() user: AuthenticatedUser) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.getOutOfStockProducts(organizationId);
  }

  @Get('sku/:sku')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get product by SKU',
    description: 'Get a specific product by its SKU',
  })
  @ApiParam({
    name: 'sku',
    description: 'Product SKU',
    type: 'string',
    example: 'SKU-001-2024',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async getProductBySku(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sku') sku: string,
  ) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.getProductBySku(sku, organizationId);
  }

  @Get('barcode/:barcode')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get product by barcode',
    description: 'Get a specific product by its barcode',
  })
  @ApiParam({
    name: 'barcode',
    description: 'Product barcode',
    type: 'string',
    example: '1234567890123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async getProductByBarcode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barcode') barcode: string,
  ) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.getProductByBarcode(barcode, organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Get a specific product by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async getProductById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.getProductById(id, organizationId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Update product',
    description: 'Update an existing product',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Product with SKU or barcode already exists',
  })
  async updateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
  ) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.updateProduct(id, organizationId, updateProductDto);
  }

  @Patch(':id/stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Update product stock',
    description: 'Update the stock level of a product',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        stock: {
          type: 'number',
          minimum: 0,
          example: 100,
        },
        reason: {
          type: 'string',
          example: 'Manual adjustment',
        },
      },
      required: ['stock'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product stock updated successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid stock value',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async updateProductStock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { stock: number; reason?: string },
  ) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    return await this.productService.updateProductStock(
      id,
      organizationId,
      body.stock,
      body.reason,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Delete product',
    description: 'Delete a product (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async deleteProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const organizationId = await this.organizationResolver.getOrganizationId();
    await this.productService.deleteProduct(id, organizationId);
  }
}
