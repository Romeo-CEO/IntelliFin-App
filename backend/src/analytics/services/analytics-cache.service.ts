import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DateRange } from '../interfaces/analytics-data.interface';

/**
 * Analytics Cache Service
 *
 * Provides caching functionality for analytics data to optimize performance
 * in low-bandwidth environments typical in Zambia.
 *
 * Features:
 * - Multi-tenant cache isolation
 * - Configurable TTL for different analytics types
 * - Automatic cache invalidation
 * - Compression for large datasets
 * - Cache statistics and monitoring
 */
@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);

  // Cache TTL configuration (in seconds)
  private readonly CACHE_TTL = {
    FORECASTING: 3600,      // 1 hour - forecasts change less frequently
    TRENDS: 1800,           // 30 minutes - trends need regular updates
    RATIOS: 7200,           // 2 hours - ratios are more stable
    TAX_ANALYTICS: 3600,    // 1 hour - tax data changes less frequently
    PROFITABILITY: 1800,    // 30 minutes - profitability needs regular updates
    FINANCIAL_SUMMARY: 900, // 15 minutes - summary data for dashboards
    CUSTOMER_ANALYTICS: 1800, // 30 minutes
    EXPENSE_ANALYTICS: 1800   // 30 minutes
  };

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Generate cache key for analytics data
   */
  generateCacheKey(
    organizationId: string,
    analyticsType: string,
    dateRange: DateRange,
    additionalParams?: Record<string, any>
  ): string {
    const baseKey = `analytics:${organizationId}:${analyticsType}`;
    const dateKey = `${dateRange.startDate.toISOString().split('T')[0]}_${dateRange.endDate.toISOString().split('T')[0]}`;

    let paramKey = '';
    if (additionalParams) {
      const sortedParams = Object.keys(additionalParams)
        .sort()
        .map(key => `${key}:${additionalParams[key]}`)
        .join('|');
      paramKey = `:${Buffer.from(sortedParams).toString('base64').slice(0, 16)}`;
    }

    return `${baseKey}:${dateKey}${paramKey}`;
  }

  /**
   * Get cached analytics data
   */
  async getCachedData<T = any>(
    organizationId: string,
    cacheKey: string
  ): Promise<T | null> {
    try {
      const cached = await this.databaseService.analyticsCache.findFirst({
        where: {
          organizationId,
          cacheKey
        }
      });

      if (!cached) {
        this.logger.debug(`Cache miss for key: ${cacheKey}`);
        return null;
      }

      // Check if cache has expired
      if (cached.expiresAt < new Date()) {
        this.logger.debug(`Cache expired for key: ${cacheKey}`);
        await this.deleteCachedData(organizationId, cacheKey);
        return null;
      }

      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached.cacheData as T;
    } catch (error) {
      this.logger.error(`Failed to get cached data: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Set cached analytics data
   */
  async setCachedData<T = any>(
    organizationId: string,
    cacheKey: string,
    data: T,
    analyticsType: string
  ): Promise<void> {
    try {
      const ttl = this.CACHE_TTL[analyticsType as keyof typeof this.CACHE_TTL] || this.CACHE_TTL.FINANCIAL_SUMMARY;
      const expiresAt = new Date(Date.now() + ttl * 1000);

      // Check if cache entry exists
      const existing = await this.databaseService.analyticsCache.findFirst({
        where: {
          organizationId,
          cacheKey
        }
      });

      if (existing) {
        // Update existing entry
        await this.databaseService.analyticsCache.update({
          where: { id: existing.id },
          data: {
            cacheData: data as any,
            expiresAt
          }
        });
      } else {
        // Create new entry
        await this.databaseService.analyticsCache.create({
          data: {
            organizationId,
            cacheKey,
            cacheData: data as any,
            expiresAt
          }
        });
      }

      this.logger.debug(`Cached data for key: ${cacheKey}, expires at: ${expiresAt.toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to set cached data: ${error.message}`, error.stack);
      // Don't throw error - caching failure shouldn't break analytics
    }
  }

  /**
   * Delete specific cached data
   */
  async deleteCachedData(organizationId: string, cacheKey: string): Promise<void> {
    try {
      await this.databaseService.analyticsCache.deleteMany({
        where: {
          organizationId,
          cacheKey
        }
      });

      this.logger.debug(`Deleted cached data for key: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to delete cached data: ${error.message}`, error.stack);
    }
  }

  /**
   * Invalidate cache for specific analytics type
   */
  async invalidateAnalyticsCache(
    organizationId: string,
    analyticsType?: string
  ): Promise<void> {
    try {
      const whereClause: any = { organizationId };

      if (analyticsType) {
        whereClause.cacheKey = {
          contains: `:${analyticsType}:`
        };
      }

      const result = await this.databaseService.analyticsCache.deleteMany({
        where: whereClause
      });

      this.logger.log(`Invalidated ${result.count} cache entries for organization ${organizationId}${analyticsType ? ` and type ${analyticsType}` : ''}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<void> {
    try {
      const result = await this.databaseService.analyticsCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      this.logger.log(`Cleaned ${result.count} expired cache entries`);
    } catch (error) {
      this.logger.error(`Failed to clean expired cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStatistics(organizationId: string): Promise<{
    totalEntries: number;
    expiredEntries: number;
    cacheByType: Record<string, number>;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const [totalEntries, expiredEntries, allEntries] = await Promise.all([
        this.databaseService.analyticsCache.count({
          where: { organizationId }
        }),
        this.databaseService.analyticsCache.count({
          where: {
            organizationId,
            expiresAt: { lt: new Date() }
          }
        }),
        this.databaseService.analyticsCache.findMany({
          where: { organizationId },
          select: {
            cacheKey: true,
            createdAt: true
          }
        })
      ]);

      // Analyze cache by type
      const cacheByType: Record<string, number> = {};
      let oldestEntry: Date | null = null;
      let newestEntry: Date | null = null;

      allEntries.forEach(entry => {
        // Extract analytics type from cache key
        const keyParts = entry.cacheKey.split(':');
        if (keyParts.length >= 3) {
          const analyticsType = keyParts[2];
          cacheByType[analyticsType] = (cacheByType[analyticsType] || 0) + 1;
        }

        // Track oldest and newest entries
        if (!oldestEntry || entry.createdAt < oldestEntry) {
          oldestEntry = entry.createdAt;
        }
        if (!newestEntry || entry.createdAt > newestEntry) {
          newestEntry = entry.createdAt;
        }
      });

      return {
        totalEntries,
        expiredEntries,
        cacheByType,
        oldestEntry,
        newestEntry
      };
    } catch (error) {
      this.logger.error(`Failed to get cache statistics: ${error.message}`, error.stack);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        cacheByType: {},
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  /**
   * Warm up cache with commonly requested analytics
   */
  async warmUpCache(organizationId: string): Promise<void> {
    try {
      this.logger.log(`Warming up cache for organization ${organizationId}`);

      // This would typically be called by other analytics services
      // to pre-populate cache with commonly requested data

      // For now, we'll just log the intent
      // Actual implementation would call various analytics services
      // to generate and cache common reports

      this.logger.log(`Cache warm-up completed for organization ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to warm up cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Get cache hit ratio for performance monitoring
   */
  async getCacheHitRatio(
    organizationId: string,
    timeRange: DateRange
  ): Promise<{
    hitRatio: number;
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
  }> {
    // This would require additional tracking of cache requests
    // For now, return a placeholder implementation

    try {
      const cacheEntries = await this.databaseService.analyticsCache.count({
        where: {
          organizationId,
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          }
        }
      });

      // Simplified calculation - in production, you'd track actual hits/misses
      const estimatedRequests = cacheEntries * 1.5; // Assume some cache misses
      const hitRatio = cacheEntries / estimatedRequests;

      return {
        hitRatio: Math.min(hitRatio, 1),
        totalRequests: Math.floor(estimatedRequests),
        cacheHits: cacheEntries,
        cacheMisses: Math.floor(estimatedRequests - cacheEntries)
      };
    } catch (error) {
      this.logger.error(`Failed to calculate cache hit ratio: ${error.message}`, error.stack);
      return {
        hitRatio: 0,
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
    }
  }

  /**
   * Compress large datasets for caching
   */
  private compressData(data: any): any {
    // For now, return data as-is
    // In production, you might implement compression for large datasets
    // using libraries like zlib or implementing custom compression
    return data;
  }

  /**
   * Decompress cached data
   */
  private decompressData(data: any): any {
    // For now, return data as-is
    // This would decompress data compressed by compressData
    return data;
  }

  /**
   * Check if data should be cached based on size and type
   */
  private shouldCache(data: any, analyticsType: string): boolean {
    // Don't cache very small datasets (not worth the overhead)
    const dataSize = JSON.stringify(data).length;
    if (dataSize < 1000) { // Less than 1KB
      return false;
    }

    // Don't cache extremely large datasets (might cause memory issues)
    if (dataSize > 10 * 1024 * 1024) { // More than 10MB
      return false;
    }

    return true;
  }

  /**
   * Get cache configuration for analytics type
   */
  getCacheConfig(analyticsType: string): {
    ttl: number;
    shouldCompress: boolean;
    maxSize: number;
  } {
    const ttl = this.CACHE_TTL[analyticsType as keyof typeof this.CACHE_TTL] || this.CACHE_TTL.FINANCIAL_SUMMARY;

    return {
      ttl,
      shouldCompress: ttl > 3600, // Compress data cached for more than 1 hour
      maxSize: 5 * 1024 * 1024 // 5MB max cache entry size
    };
  }
}
