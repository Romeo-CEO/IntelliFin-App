import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Inventory Cache Service
 * Provides caching functionality for inventory data
 * Optimized for low-bandwidth Zambian environments
 */
@Injectable()
export class InventoryCacheService {
  private readonly logger = new Logger(InventoryCacheService.name);
  private readonly redis: Redis;
  private readonly cachePrefix = 'intellifin:inventory:';
  private readonly defaultTtl = 300; // 5 minutes

  // Cache TTL configuration (in seconds)
  private readonly CACHE_TTL = {
    PRODUCTS: 300,        // 5 minutes - products change frequently
    SUPPLIERS: 600,       // 10 minutes - suppliers change less frequently
    PURCHASE_ORDERS: 180, // 3 minutes - POs change during processing
    STOCK_MOVEMENTS: 120, // 2 minutes - stock movements are real-time
    STOCK_ALERTS: 60,     // 1 minute - alerts need to be current
    INVENTORY_REPORTS: 900, // 15 minutes - reports are expensive to generate
    PRODUCT_STATS: 300,   // 5 minutes - stats for dashboards
    LOW_STOCK: 180,       // 3 minutes - low stock alerts
  };

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db'),
      keyPrefix: this.configService.get<string>('redis.keyPrefix'),
      retryAttempts: this.configService.get<number>('redis.retryAttempts'),
      retryDelay: this.configService.get<number>('redis.retryDelay'),
      maxRetriesPerRequest: this.configService.get<number>('redis.maxRetriesPerRequest'),
      lazyConnect: this.configService.get<boolean>('redis.lazyConnect'),
      keepAlive: this.configService.get<number>('redis.keepAlive'),
      family: this.configService.get<number>('redis.family'),
      connectTimeout: this.configService.get<number>('redis.connectTimeout'),
      commandTimeout: this.configService.get<number>('redis.commandTimeout'),
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`, error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for inventory caching');
    });
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.cachePrefix + key;
      const cached = await this.redis.get(fullKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        this.logger.debug(`Cache hit for key: ${key}`);
        return data;
      }
      
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cached data for key ${key}: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set(key: string, data: any, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = this.cachePrefix + key;
      const ttl = ttlSeconds || this.defaultTtl;
      
      await this.redis.setex(fullKey, ttl, JSON.stringify(data));
      this.logger.debug(`Cached data for key: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Failed to cache data for key ${key}: ${error.message}`, error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.cachePrefix + key;
      await this.redis.del(fullKey);
      this.logger.debug(`Deleted cached data for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cached data for key ${key}: ${error.message}`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = this.cachePrefix + pattern;
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Deleted ${keys.length} cached keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete cached data for pattern ${pattern}: ${error.message}`, error);
    }
  }

  /**
   * Invalidate organization cache
   */
  async invalidateOrganizationCache(organizationId: string): Promise<void> {
    try {
      await this.deletePattern(`*${organizationId}*`);
      this.logger.log(`Invalidated cache for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate organization cache: ${error.message}`, error);
    }
  }

  /**
   * Invalidate product cache
   */
  async invalidateProductCache(organizationId: string): Promise<void> {
    try {
      await Promise.all([
        this.deletePattern(`products_*${organizationId}*`),
        this.deletePattern(`product_*`),
        this.deletePattern(`product_stats_${organizationId}`),
        this.deletePattern(`products_select_${organizationId}`),
      ]);
      this.logger.log(`Invalidated product cache for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate product cache: ${error.message}`, error);
    }
  }

  /**
   * Invalidate supplier cache
   */
  async invalidateSupplierCache(organizationId: string): Promise<void> {
    try {
      await Promise.all([
        this.deletePattern(`suppliers_*${organizationId}*`),
        this.deletePattern(`supplier_*`),
        this.deletePattern(`supplier_stats_${organizationId}`),
        this.deletePattern(`suppliers_select_${organizationId}`),
      ]);
      this.logger.log(`Invalidated supplier cache for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate supplier cache: ${error.message}`, error);
    }
  }

  /**
   * Invalidate purchase order cache
   */
  async invalidatePurchaseOrderCache(organizationId: string): Promise<void> {
    try {
      await Promise.all([
        this.deletePattern(`purchase_orders_*${organizationId}*`),
        this.deletePattern(`purchase_order_*`),
        this.deletePattern(`po_stats_${organizationId}`),
      ]);
      this.logger.log(`Invalidated purchase order cache for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate purchase order cache: ${error.message}`, error);
    }
  }

  /**
   * Invalidate stock movement cache
   */
  async invalidateStockMovementCache(organizationId: string): Promise<void> {
    try {
      await Promise.all([
        this.deletePattern(`stock_movements_*${organizationId}*`),
        this.deletePattern(`stock_movement_*`),
        this.deletePattern(`stock_stats_${organizationId}`),
      ]);
      this.logger.log(`Invalidated stock movement cache for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate stock movement cache: ${error.message}`, error);
    }
  }

  /**
   * Invalidate stock alert cache
   */
  async invalidateStockAlertCache(organizationId: string): Promise<void> {
    try {
      await Promise.all([
        this.deletePattern(`stock_alerts_*${organizationId}*`),
        this.deletePattern(`stock_alert_*`),
        this.deletePattern(`alert_stats_${organizationId}`),
      ]);
      this.logger.log(`Invalidated stock alert cache for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate stock alert cache: ${error.message}`, error);
    }
  }

  /**
   * Get or set pattern - get from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    cacheType: keyof typeof this.CACHE_TTL = 'PRODUCTS',
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Compute the value
      const computed = await computeFn();
      
      // Cache the computed value
      const ttl = this.CACHE_TTL[cacheType];
      await this.set(key, computed, ttl);
      
      return computed;
    } catch (error) {
      this.logger.error(`Failed to get or set cache for key ${key}: ${error.message}`, error);
      // If caching fails, still return the computed value
      return computeFn();
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      const fullKeys = keys.map(key => this.cachePrefix + key);
      const results = await this.redis.mget(...fullKeys);
      
      return results.map(result => {
        if (result) {
          try {
            return JSON.parse(result);
          } catch {
            return result;
          }
        }
        return null;
      });
    } catch (error) {
      this.logger.error(`Failed to batch get cache keys: ${error.message}`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Batch set multiple keys
   */
  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      keyValuePairs.forEach(({ key, value, ttl }) => {
        const fullKey = this.cachePrefix + key;
        const ttlSeconds = ttl || this.defaultTtl;
        pipeline.setex(fullKey, ttlSeconds, JSON.stringify(value));
      });
      
      await pipeline.exec();
      this.logger.debug(`Batch cached ${keyValuePairs.length} keys`);
    } catch (error) {
      this.logger.error(`Failed to batch set cache keys: ${error.message}`, error);
    }
  }

  /**
   * Get cache key for specific data type
   */
  getCacheKey(type: string, organizationId: string, ...params: string[]): string {
    const keyParts = [type, organizationId, ...params];
    return keyParts.join('_');
  }

  /**
   * Check if cache is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.warn(`Cache not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: true,
      };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error.message}`, error);
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear all inventory cache
   */
  async clearAll(): Promise<void> {
    try {
      await this.deletePattern('*');
      this.logger.log('Cleared all inventory cache');
    } catch (error) {
      this.logger.error(`Failed to clear all cache: ${error.message}`, error);
    }
  }
}
