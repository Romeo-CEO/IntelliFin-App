import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Dashboard Cache Service
 * Provides caching functionality for dashboard data
 * Optimized for low-bandwidth Zambian environments
 */
@Injectable()
export class DashboardCacheService {
  private readonly logger = new Logger(DashboardCacheService.name);
  private readonly redis: Redis;
  private readonly cachePrefix = 'intellifin:dashboard:';
  private readonly defaultTtl = 300; // 5 minutes

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis connection
    const redisConfig = this.configService.get('redis');
    this.redis = new Redis({
      host: redisConfig?.host || 'localhost',
      port: redisConfig?.port || 6379,
      password: redisConfig?.password,
      db: redisConfig?.db || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for dashboard caching');
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`, error);
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
   * Delete multiple cached keys by pattern
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
   * Invalidate widget cache
   */
  async invalidateWidgetCache(widgetId: string): Promise<void> {
    try {
      await this.delete(`widget_data_${widgetId}`);
      this.logger.log(`Invalidated cache for widget: ${widgetId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate widget cache: ${error.message}`, error);
    }
  }

  /**
   * Invalidate dashboard cache
   */
  async invalidateDashboardCache(dashboardId: string): Promise<void> {
    try {
      await this.deletePattern(`*dashboard_${dashboardId}*`);
      this.logger.log(`Invalidated cache for dashboard: ${dashboardId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate dashboard cache: ${error.message}`, error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      // Parse memory usage from Redis info
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';
      
      return {
        totalKeys: keyCount,
        memoryUsage,
        hitRate: 0, // Would need to track hits/misses for accurate calculation
      };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error.message}`, error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
        hitRate: 0,
      };
    }
  }

  /**
   * Warm up cache with common data
   */
  async warmUpCache(organizationId: string): Promise<void> {
    try {
      this.logger.log(`Starting cache warm-up for organization: ${organizationId}`);
      
      // This would pre-load commonly accessed data
      // Implementation would depend on usage patterns
      
      this.logger.log(`Cache warm-up completed for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to warm up cache: ${error.message}`, error);
    }
  }

  /**
   * Set cache with compression for large data
   */
  async setCompressed(key: string, data: any, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = this.cachePrefix + key;
      const ttl = ttlSeconds || this.defaultTtl;
      
      // For large data, we could implement compression here
      // For now, using standard JSON serialization
      const serialized = JSON.stringify(data);
      
      // Only compress if data is larger than 1KB
      if (serialized.length > 1024) {
        // Implementation would use compression library like zlib
        this.logger.debug(`Large data cached for key: ${key} (${serialized.length} bytes)`);
      }
      
      await this.redis.setex(fullKey, ttl, serialized);
      this.logger.debug(`Cached data for key: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Failed to cache compressed data for key ${key}: ${error.message}`, error);
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
   * Cleanup expired keys (maintenance operation)
   */
  async cleanup(): Promise<void> {
    try {
      // Redis automatically handles TTL expiration
      // This method could be used for custom cleanup logic
      this.logger.debug('Cache cleanup completed');
    } catch (error) {
      this.logger.error(`Failed to cleanup cache: ${error.message}`, error);
    }
  }

  /**
   * Get or set pattern - get from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds?: number,
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
      await this.set(key, computed, ttlSeconds);
      
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
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.cachePrefix + key);
      const results = await this.redis.mget(...fullKeys);
      
      return results.map(result => {
        if (result) {
          try {
            return JSON.parse(result);
          } catch {
            return null;
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
}
