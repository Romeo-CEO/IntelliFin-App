import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Product } from '@prisma/client';
import {
  ProductRepository,
  CreateProductData,
  UpdateProductData,
  ProductFilters,
} from './product.repository';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';
import { InventoryValidationService } from '../services/inventory-validation.service';
import { InventoryCacheService } from '../services/inventory-cache.service';
import { StockLevelService } from '../services/stock-level.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly validationService: InventoryValidationService,
    private readonly cacheService: InventoryCacheService,
    private readonly stockLevelService: StockLevelService,
  ) {}

  /**
   * Create a new product
   */
  async createProduct(organizationId: string, createProductDto: CreateProductDto): Promise<Product> {
    try {
      // Validate SKU uniqueness
      const existingProduct = await this.productRepository.findBySku(
        createProductDto.sku,
        organizationId,
      );
      if (existingProduct) {
        throw new ConflictException(`Product with SKU '${createProductDto.sku}' already exists`);
      }

      // Validate barcode uniqueness if provided
      if (createProductDto.barcode) {
        const existingByBarcode = await this.productRepository.findByBarcode(
          createProductDto.barcode,
          organizationId,
        );
        if (existingByBarcode) {
          throw new ConflictException(`Product with barcode '${createProductDto.barcode}' already exists`);
        }
      }

      // Validate business rules
      await this.validationService.validateProductData(createProductDto);

      // Create product data
      const productData: CreateProductData = {
        organizationId,
        ...createProductDto,
      };

      const product = await this.productRepository.create(productData);

      // Invalidate cache
      await this.cacheService.invalidateProductCache(organizationId);

      // Check if initial stock alerts need to be created
      if (product.trackStock && product.currentStock <= product.minimumStock) {
        await this.stockLevelService.checkStockLevels(organizationId, product.id);
      }

      this.logger.log(`Created product: ${product.id} (SKU: ${product.sku})`);
      return product;
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string, organizationId: string): Promise<Product> {
    try {
      const cacheKey = `product_${id}`;
      
      // Try to get from cache first
      const cached = await this.cacheService.get<Product>(cacheKey);
      if (cached) {
        return cached;
      }

      const product = await this.productRepository.findById(id, organizationId);
      if (!product) {
        throw new NotFoundException(`Product with ID '${id}' not found`);
      }

      // Cache the result
      await this.cacheService.set(cacheKey, product, 300); // 5 minutes

      return product;
    } catch (error) {
      this.logger.error(`Failed to get product by ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string, organizationId: string): Promise<Product> {
    try {
      const product = await this.productRepository.findBySku(sku, organizationId);
      if (!product) {
        throw new NotFoundException(`Product with SKU '${sku}' not found`);
      }
      return product;
    } catch (error) {
      this.logger.error(`Failed to get product by SKU: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string, organizationId: string): Promise<Product> {
    try {
      const product = await this.productRepository.findByBarcode(barcode, organizationId);
      if (!product) {
        throw new NotFoundException(`Product with barcode '${barcode}' not found`);
      }
      return product;
    } catch (error) {
      this.logger.error(`Failed to get product by barcode: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get products with filters and pagination
   */
  async getProducts(organizationId: string, query: ProductQueryDto) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc',
        ...filters
      } = query;

      const skip = (page - 1) * limit;
      const orderBy = { [sortBy]: sortOrder };

      const productFilters: ProductFilters = {
        organizationId,
        ...filters,
      };

      const cacheKey = `products_${organizationId}_${JSON.stringify(query)}`;
      
      // Try to get from cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const [products, total] = await Promise.all([
        this.productRepository.findMany(productFilters, orderBy, skip, limit),
        this.productRepository.count(productFilters),
      ]);

      const totalPages = Math.ceil(total / limit);

      const result = {
        products,
        total,
        page,
        limit,
        totalPages,
      };

      // Cache the result
      await this.cacheService.set(cacheKey, result, 180); // 3 minutes

      return result;
    } catch (error) {
      this.logger.error(`Failed to get products: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    id: string,
    organizationId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    try {
      // Check if product exists
      const existingProduct = await this.getProductById(id, organizationId);

      // Validate SKU uniqueness if SKU is being updated
      if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
        const existingBySku = await this.productRepository.findBySku(
          updateProductDto.sku,
          organizationId,
        );
        if (existingBySku && existingBySku.id !== id) {
          throw new ConflictException(`Product with SKU '${updateProductDto.sku}' already exists`);
        }
      }

      // Validate barcode uniqueness if barcode is being updated
      if (updateProductDto.barcode && updateProductDto.barcode !== existingProduct.barcode) {
        const existingByBarcode = await this.productRepository.findByBarcode(
          updateProductDto.barcode,
          organizationId,
        );
        if (existingByBarcode && existingByBarcode.id !== id) {
          throw new ConflictException(`Product with barcode '${updateProductDto.barcode}' already exists`);
        }
      }

      // Validate business rules
      await this.validationService.validateProductData(updateProductDto);

      const updateData: UpdateProductData = updateProductDto;
      const updatedProduct = await this.productRepository.update(id, organizationId, updateData);

      // Invalidate cache
      await this.cacheService.invalidateProductCache(organizationId);
      await this.cacheService.delete(`product_${id}`);

      // Check stock levels if minimum stock was updated
      if (updateProductDto.minimumStock !== undefined && updatedProduct.trackStock) {
        await this.stockLevelService.checkStockLevels(organizationId, id);
      }

      this.logger.log(`Updated product: ${id}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Failed to update product: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update product stock level
   */
  async updateProductStock(
    id: string,
    organizationId: string,
    newStock: number,
    reason?: string,
  ): Promise<Product> {
    try {
      if (newStock < 0) {
        throw new BadRequestException('Stock level cannot be negative');
      }

      const existingProduct = await this.getProductById(id, organizationId);
      
      if (!existingProduct.trackStock) {
        throw new BadRequestException('Stock tracking is disabled for this product');
      }

      const updatedProduct = await this.productRepository.updateStock(id, organizationId, newStock);

      // Invalidate cache
      await this.cacheService.invalidateProductCache(organizationId);
      await this.cacheService.delete(`product_${id}`);

      // Check stock levels and create alerts if necessary
      await this.stockLevelService.checkStockLevels(organizationId, id);

      this.logger.log(`Updated stock for product ${id}: ${existingProduct.currentStock} -> ${newStock}`);
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Failed to update product stock: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(id: string, organizationId: string): Promise<void> {
    try {
      // Check if product exists
      await this.getProductById(id, organizationId);

      // TODO: Check if product has associated stock movements, purchase orders, etc.
      // For now, we'll allow deletion but in production you might want to prevent
      // deletion of products with transaction history

      await this.productRepository.softDelete(id, organizationId);

      // Invalidate cache
      await this.cacheService.invalidateProductCache(organizationId);
      await this.cacheService.delete(`product_${id}`);

      this.logger.log(`Deleted product: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete product: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats(organizationId: string) {
    try {
      const cacheKey = `product_stats_${organizationId}`;
      
      // Try to get from cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const stats = await this.productRepository.getProductStats(organizationId);

      // Cache the result
      await this.cacheService.set(cacheKey, stats, 300); // 5 minutes

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get product stats: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Search products by name, SKU, or barcode
   */
  async searchProducts(organizationId: string, searchTerm: string, limit = 10) {
    try {
      const filters: ProductFilters = {
        organizationId,
        search: searchTerm,
        isActive: true,
      };

      return await this.productRepository.findMany(
        filters,
        { name: 'asc' },
        0,
        limit,
      );
    } catch (error) {
      this.logger.error(`Failed to search products: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get products for dropdown/select options
   */
  async getProductsForSelect(organizationId: string) {
    try {
      const cacheKey = `products_select_${organizationId}`;
      
      // Try to get from cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const filters: ProductFilters = {
        organizationId,
        isActive: true,
      };

      const products = await this.productRepository.findMany(
        filters,
        { name: 'asc' },
      );

      const result = products.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        currentStock: product.currentStock,
        unit: product.unit,
        sellingPrice: product.sellingPrice,
        trackStock: product.trackStock,
      }));

      // Cache the result
      await this.cacheService.set(cacheKey, result, 600); // 10 minutes

      return result;
    } catch (error) {
      this.logger.error(`Failed to get products for select: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(organizationId: string) {
    try {
      const filters: ProductFilters = {
        organizationId,
        isActive: true,
        lowStock: true,
      };

      return await this.productRepository.findMany(
        filters,
        { currentStock: 'asc' },
      );
    } catch (error) {
      this.logger.error(`Failed to get low stock products: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get out of stock products
   */
  async getOutOfStockProducts(organizationId: string) {
    try {
      const filters: ProductFilters = {
        organizationId,
        isActive: true,
        outOfStock: true,
      };

      return await this.productRepository.findMany(
        filters,
        { name: 'asc' },
      );
    } catch (error) {
      this.logger.error(`Failed to get out of stock products: ${error.message}`, error);
      throw error;
    }
  }
}
