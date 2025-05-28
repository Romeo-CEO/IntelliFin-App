import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface PerformanceMetrics {
  queryPerformance: {
    averageResponseTime: number;
    slowQueries: Array<{
      query: string;
      duration: number;
      frequency: number;
    }>;
    totalQueries: number;
    cacheHitRate: number;
  };
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
    totalKeys: number;
  };
  databaseMetrics: {
    connectionPoolSize: number;
    activeConnections: number;
    queryQueueLength: number;
    indexEfficiency: number;
  };
  recommendations: Array<{
    type: 'QUERY' | 'CACHE' | 'INDEX' | 'SCHEMA';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    expectedImprovement: string;
    implementationCost: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

export interface CacheStrategy {
  key: string;
  ttl: number; // Time to live in seconds
  tags: string[];
  compressionEnabled: boolean;
  invalidationRules: string[];
}

export interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  indexSuggestions: string[];
  estimatedImprovement: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class PerformanceOptimizationService {
  private readonly logger = new Logger(PerformanceOptimizationService.name);
  private readonly queryMetrics = new Map<string, { count: number; totalTime: number; lastExecuted: Date }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(organizationId?: string): Promise<PerformanceMetrics> {
    try {
      this.logger.log(`Getting performance metrics${organizationId ? ` for organization: ${organizationId}` : ''}`);

      const queryPerformance = await this.getQueryPerformanceMetrics();
      const cacheMetrics = await this.getCacheMetrics();
      const databaseMetrics = await this.getDatabaseMetrics();
      const recommendations = await this.generatePerformanceRecommendations(queryPerformance, cacheMetrics, databaseMetrics);

      const metrics: PerformanceMetrics = {
        queryPerformance,
        cacheMetrics,
        databaseMetrics,
        recommendations,
      };

      this.logger.log('Performance metrics generated successfully');
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get performance metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Optimize tax calculation queries
   */
  async optimizeTaxCalculationQueries(organizationId: string): Promise<QueryOptimization[]> {
    try {
      this.logger.log(`Optimizing tax calculation queries for organization: ${organizationId}`);

      const optimizations: QueryOptimization[] = [];

      // Common tax calculation query patterns
      const commonQueries = [
        {
          name: 'Tax Rate Lookup',
          original: `SELECT * FROM tax_rates WHERE organization_id = ? AND tax_type = ? AND effective_date <= ? ORDER BY effective_date DESC LIMIT 1`,
          optimized: `SELECT rate, effective_date FROM tax_rates WHERE organization_id = ? AND tax_type = ? AND effective_date <= ? AND is_active = true ORDER BY effective_date DESC LIMIT 1`,
          indexSuggestions: ['CREATE INDEX idx_tax_rates_lookup ON tax_rates(organization_id, tax_type, effective_date, is_active)'],
          estimatedImprovement: 40,
        },
        {
          name: 'Tax Period Lookup',
          original: `SELECT * FROM tax_periods WHERE organization_id = ? AND tax_type = ? AND period_start <= ? AND period_end >= ?`,
          optimized: `SELECT id, period_start, period_end, filing_deadline FROM tax_periods WHERE organization_id = ? AND tax_type = ? AND period_start <= ? AND period_end >= ? AND status = 'ACTIVE'`,
          indexSuggestions: ['CREATE INDEX idx_tax_periods_lookup ON tax_periods(organization_id, tax_type, period_start, period_end, status)'],
          estimatedImprovement: 35,
        },
        {
          name: 'Withholding Certificate Aggregation',
          original: `SELECT SUM(gross_amount), SUM(tax_withheld) FROM withholding_tax_certificates WHERE organization_id = ? AND issue_date BETWEEN ? AND ?`,
          optimized: `SELECT SUM(gross_amount), SUM(tax_withheld) FROM withholding_tax_certificates WHERE organization_id = ? AND issue_date BETWEEN ? AND ? AND status != 'CANCELLED'`,
          indexSuggestions: ['CREATE INDEX idx_withholding_aggregation ON withholding_tax_certificates(organization_id, issue_date, status) INCLUDE (gross_amount, tax_withheld)'],
          estimatedImprovement: 50,
        },
      ];

      for (const query of commonQueries) {
        optimizations.push({
          originalQuery: query.original,
          optimizedQuery: query.optimized,
          indexSuggestions: query.indexSuggestions,
          estimatedImprovement: query.estimatedImprovement,
          complexity: 'MEDIUM',
        });
      }

      this.logger.log(`Generated ${optimizations.length} query optimizations`);
      return optimizations;
    } catch (error) {
      this.logger.error(`Failed to optimize tax calculation queries: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Implement intelligent caching for tax data
   */
  async implementTaxDataCaching(organizationId: string): Promise<CacheStrategy[]> {
    try {
      this.logger.log(`Implementing tax data caching for organization: ${organizationId}`);

      const cacheStrategies: CacheStrategy[] = [
        {
          key: `tax_rates:${organizationId}`,
          ttl: 3600, // 1 hour
          tags: ['tax_rates', organizationId],
          compressionEnabled: true,
          invalidationRules: ['tax_rate_updated', 'organization_settings_changed'],
        },
        {
          key: `tax_periods:${organizationId}`,
          ttl: 7200, // 2 hours
          tags: ['tax_periods', organizationId],
          compressionEnabled: true,
          invalidationRules: ['tax_period_created', 'tax_period_updated'],
        },
        {
          key: `compliance_score:${organizationId}`,
          ttl: 1800, // 30 minutes
          tags: ['compliance', organizationId],
          compressionEnabled: false,
          invalidationRules: ['tax_obligation_updated', 'payment_recorded'],
        },
        {
          key: `withholding_summary:${organizationId}`,
          ttl: 900, // 15 minutes
          tags: ['withholding', organizationId],
          compressionEnabled: true,
          invalidationRules: ['withholding_certificate_created', 'withholding_certificate_submitted'],
        },
        {
          key: `tax_analytics:${organizationId}`,
          ttl: 3600, // 1 hour
          tags: ['analytics', organizationId],
          compressionEnabled: true,
          invalidationRules: ['daily_analytics_refresh'],
        },
      ];

      // Implement caching for each strategy
      for (const strategy of cacheStrategies) {
        await this.setupCacheStrategy(strategy);
      }

      this.logger.log(`Implemented ${cacheStrategies.length} cache strategies`);
      return cacheStrategies;
    } catch (error) {
      this.logger.error(`Failed to implement tax data caching: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Optimize database indexes for tax queries
   */
  async optimizeDatabaseIndexes(): Promise<string[]> {
    try {
      this.logger.log('Optimizing database indexes for tax queries');

      const indexOptimizations = [
        // Tax rates optimization
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tax_rates_active_lookup ON tax_rates(organization_id, tax_type, effective_date DESC, is_active) WHERE is_active = true',
        
        // Tax periods optimization
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tax_periods_current ON tax_periods(organization_id, tax_type, period_start, period_end) WHERE status = \'ACTIVE\'',
        
        // Tax obligations optimization
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tax_obligations_due ON tax_obligations(organization_id, due_date, status) INCLUDE (amount_due, amount_paid)',
        
        // Withholding certificates optimization
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withholding_certificates_period ON withholding_tax_certificates(organization_id, issue_date, status) INCLUDE (gross_amount, tax_withheld)',
        
        // Tax adjustments optimization
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tax_adjustments_workflow ON tax_adjustments(organization_id, status, requested_at) INCLUDE (adjustment_amount)',
        
        // Tax filings optimization
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tax_filings_submission ON tax_filings(organization_id, filing_type, status, submitted_at)',
        
        // Payments with withholding tax
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_withholding ON payments(organization_id, payment_date) WHERE withholding_tax_amount > 0',
        
        // Customer tax profiles
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_tax_profiles_tin ON customer_tax_profiles(organization_id, tin_number, tin_validated) WHERE tin_validated = true',
      ];

      // Execute index creation (in a real implementation, this would be done via migrations)
      this.logger.log(`Generated ${indexOptimizations.length} index optimization commands`);
      return indexOptimizations;
    } catch (error) {
      this.logger.error(`Failed to optimize database indexes: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Monitor and log query performance
   */
  async trackQueryPerformance(queryName: string, duration: number): Promise<void> {
    try {
      const existing = this.queryMetrics.get(queryName) || { count: 0, totalTime: 0, lastExecuted: new Date() };
      
      existing.count++;
      existing.totalTime += duration;
      existing.lastExecuted = new Date();
      
      this.queryMetrics.set(queryName, existing);

      // Log slow queries
      if (duration > 1000) { // More than 1 second
        this.logger.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }

      // Periodically clean up old metrics
      if (existing.count % 100 === 0) {
        await this.cleanupOldMetrics();
      }
    } catch (error) {
      this.logger.error(`Failed to track query performance: ${error.message}`, error.stack);
    }
  }

  /**
   * Get query performance metrics
   */
  private async getQueryPerformanceMetrics() {
    const totalQueries = Array.from(this.queryMetrics.values()).reduce((sum, metric) => sum + metric.count, 0);
    const totalTime = Array.from(this.queryMetrics.values()).reduce((sum, metric) => sum + metric.totalTime, 0);
    const averageResponseTime = totalQueries > 0 ? totalTime / totalQueries : 0;

    const slowQueries = Array.from(this.queryMetrics.entries())
      .map(([query, metric]) => ({
        query,
        duration: metric.totalTime / metric.count,
        frequency: metric.count,
      }))
      .filter(q => q.duration > 500) // Queries taking more than 500ms on average
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slow queries

    // Mock cache hit rate - in real implementation, this would come from actual cache metrics
    const cacheHitRate = 85;

    return {
      averageResponseTime,
      slowQueries,
      totalQueries,
      cacheHitRate,
    };
  }

  /**
   * Get cache metrics
   */
  private async getCacheMetrics() {
    // Mock cache metrics - in real implementation, this would come from cache manager
    return {
      hitRate: 85,
      missRate: 15,
      evictionRate: 2,
      memoryUsage: 128, // MB
      totalKeys: 1250,
    };
  }

  /**
   * Get database metrics
   */
  private async getDatabaseMetrics() {
    // Mock database metrics - in real implementation, this would come from database monitoring
    return {
      connectionPoolSize: 20,
      activeConnections: 8,
      queryQueueLength: 2,
      indexEfficiency: 92,
    };
  }

  /**
   * Generate performance recommendations
   */
  private async generatePerformanceRecommendations(queryPerformance: any, cacheMetrics: any, databaseMetrics: any) {
    const recommendations = [];

    if (queryPerformance.averageResponseTime > 500) {
      recommendations.push({
        type: 'QUERY' as const,
        priority: 'HIGH' as const,
        description: 'Average query response time is above 500ms. Consider query optimization and indexing.',
        expectedImprovement: '40-60% reduction in response time',
        implementationCost: 'MEDIUM' as const,
      });
    }

    if (cacheMetrics.hitRate < 80) {
      recommendations.push({
        type: 'CACHE' as const,
        priority: 'MEDIUM' as const,
        description: 'Cache hit rate is below 80%. Implement more aggressive caching strategies.',
        expectedImprovement: '20-30% improvement in response time',
        implementationCost: 'LOW' as const,
      });
    }

    if (databaseMetrics.indexEfficiency < 90) {
      recommendations.push({
        type: 'INDEX' as const,
        priority: 'HIGH' as const,
        description: 'Index efficiency is below 90%. Add missing indexes for frequently queried columns.',
        expectedImprovement: '50-70% improvement in query performance',
        implementationCost: 'LOW' as const,
      });
    }

    if (queryPerformance.slowQueries.length > 5) {
      recommendations.push({
        type: 'QUERY' as const,
        priority: 'CRITICAL' as const,
        description: 'Multiple slow queries detected. Immediate optimization required.',
        expectedImprovement: '60-80% reduction in slow query count',
        implementationCost: 'HIGH' as const,
      });
    }

    return recommendations;
  }

  /**
   * Setup cache strategy
   */
  private async setupCacheStrategy(strategy: CacheStrategy): Promise<void> {
    try {
      // In a real implementation, this would configure the cache with the strategy
      this.logger.log(`Setting up cache strategy for key: ${strategy.key}`);
      
      // Example: Set cache configuration
      // await this.cacheManager.set(strategy.key + ':config', strategy, strategy.ttl);
    } catch (error) {
      this.logger.error(`Failed to setup cache strategy: ${error.message}`, error.stack);
    }
  }

  /**
   * Clean up old query metrics
   */
  private async cleanupOldMetrics(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24); // Keep last 24 hours

      for (const [queryName, metric] of this.queryMetrics.entries()) {
        if (metric.lastExecuted < cutoffDate) {
          this.queryMetrics.delete(queryName);
        }
      }

      this.logger.log('Query metrics cleanup completed');
    } catch (error) {
      this.logger.error(`Failed to cleanup old metrics: ${error.message}`, error.stack);
    }
  }
}
