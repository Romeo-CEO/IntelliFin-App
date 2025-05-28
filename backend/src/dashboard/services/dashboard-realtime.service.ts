import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DashboardCacheService } from './dashboard-cache.service';
import { WidgetDataService } from './widget-data.service';

/**
 * Dashboard Realtime Service
 * Handles real-time updates for dashboard data
 * Optimized for low-bandwidth Zambian environments
 */
@Injectable()
export class DashboardRealtimeService {
  private readonly logger = new Logger(DashboardRealtimeService.name);
  private readonly updateIntervals = new Map<string, NodeJS.Timeout>();
  private readonly subscriptions = new Map<string, Set<string>>(); // organizationId -> Set of dashboardIds

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: DashboardCacheService,
    private readonly widgetDataService: WidgetDataService,
  ) {
    this.setupEventListeners();
  }

  /**
   * Subscribe to dashboard updates
   */
  async subscribeToDashboard(organizationId: string, dashboardId: string): Promise<void> {
    try {
      if (!this.subscriptions.has(organizationId)) {
        this.subscriptions.set(organizationId, new Set());
      }
      
      this.subscriptions.get(organizationId)!.add(dashboardId);
      
      // Start real-time updates for this organization if not already started
      if (!this.updateIntervals.has(organizationId)) {
        this.startRealtimeUpdates(organizationId);
      }
      
      this.logger.log(`Subscribed to dashboard updates: ${dashboardId} for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to dashboard: ${error.message}`, error);
    }
  }

  /**
   * Unsubscribe from dashboard updates
   */
  async unsubscribeFromDashboard(organizationId: string, dashboardId: string): Promise<void> {
    try {
      const orgSubscriptions = this.subscriptions.get(organizationId);
      if (orgSubscriptions) {
        orgSubscriptions.delete(dashboardId);
        
        // If no more subscriptions for this organization, stop updates
        if (orgSubscriptions.size === 0) {
          this.stopRealtimeUpdates(organizationId);
          this.subscriptions.delete(organizationId);
        }
      }
      
      this.logger.log(`Unsubscribed from dashboard updates: ${dashboardId} for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from dashboard: ${error.message}`, error);
    }
  }

  /**
   * Start real-time updates for an organization
   */
  private startRealtimeUpdates(organizationId: string): void {
    try {
      // Use longer intervals for low-bandwidth optimization
      const updateInterval = 30000; // 30 seconds
      
      const interval = setInterval(async () => {
        await this.performRealtimeUpdate(organizationId);
      }, updateInterval);
      
      this.updateIntervals.set(organizationId, interval);
      this.logger.log(`Started real-time updates for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to start real-time updates: ${error.message}`, error);
    }
  }

  /**
   * Stop real-time updates for an organization
   */
  private stopRealtimeUpdates(organizationId: string): void {
    try {
      const interval = this.updateIntervals.get(organizationId);
      if (interval) {
        clearInterval(interval);
        this.updateIntervals.delete(organizationId);
        this.logger.log(`Stopped real-time updates for organization: ${organizationId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to stop real-time updates: ${error.message}`, error);
    }
  }

  /**
   * Perform real-time update for an organization
   */
  private async performRealtimeUpdate(organizationId: string): Promise<void> {
    try {
      const dashboardIds = this.subscriptions.get(organizationId);
      if (!dashboardIds || dashboardIds.size === 0) {
        return;
      }

      // Check for data changes and emit updates
      for (const dashboardId of dashboardIds) {
        await this.checkAndEmitDashboardUpdate(organizationId, dashboardId);
      }
    } catch (error) {
      this.logger.error(`Failed to perform real-time update: ${error.message}`, error);
    }
  }

  /**
   * Check for dashboard data changes and emit updates
   */
  private async checkAndEmitDashboardUpdate(organizationId: string, dashboardId: string): Promise<void> {
    try {
      // Get current cached data hash
      const cacheKey = `dashboard_hash_${dashboardId}`;
      const currentHash = await this.cacheService.get<string>(cacheKey);
      
      // Generate new data hash (simplified - in production would use actual data)
      const newHash = await this.generateDataHash(organizationId, dashboardId);
      
      // If data has changed, emit update event
      if (currentHash !== newHash) {
        await this.cacheService.set(cacheKey, newHash, 3600); // Cache for 1 hour
        
        // Emit dashboard update event
        this.eventEmitter.emit('dashboard.updated', {
          organizationId,
          dashboardId,
          timestamp: new Date().toISOString(),
          type: 'data_update',
        });
        
        this.logger.debug(`Emitted dashboard update for: ${dashboardId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to check dashboard update: ${error.message}`, error);
    }
  }

  /**
   * Generate data hash for change detection
   */
  private async generateDataHash(organizationId: string, dashboardId: string): Promise<string> {
    try {
      // Simplified hash generation - in production would use actual data
      const timestamp = Math.floor(Date.now() / 30000); // 30-second buckets
      return `${organizationId}_${dashboardId}_${timestamp}`;
    } catch (error) {
      this.logger.error(`Failed to generate data hash: ${error.message}`, error);
      return '';
    }
  }

  /**
   * Trigger immediate dashboard refresh
   */
  async triggerDashboardRefresh(organizationId: string, dashboardId: string): Promise<void> {
    try {
      // Invalidate cache
      await this.cacheService.invalidateDashboardCache(dashboardId);
      
      // Emit refresh event
      this.eventEmitter.emit('dashboard.refresh', {
        organizationId,
        dashboardId,
        timestamp: new Date().toISOString(),
        type: 'manual_refresh',
      });
      
      this.logger.log(`Triggered dashboard refresh for: ${dashboardId}`);
    } catch (error) {
      this.logger.error(`Failed to trigger dashboard refresh: ${error.message}`, error);
    }
  }

  /**
   * Trigger widget refresh
   */
  async triggerWidgetRefresh(organizationId: string, widgetId: string): Promise<void> {
    try {
      // Invalidate widget cache
      await this.cacheService.invalidateWidgetCache(widgetId);
      
      // Emit widget refresh event
      this.eventEmitter.emit('widget.refresh', {
        organizationId,
        widgetId,
        timestamp: new Date().toISOString(),
        type: 'manual_refresh',
      });
      
      this.logger.log(`Triggered widget refresh for: ${widgetId}`);
    } catch (error) {
      this.logger.error(`Failed to trigger widget refresh: ${error.message}`, error);
    }
  }

  /**
   * Setup event listeners for data changes
   */
  private setupEventListeners(): void {
    // Listen for invoice events
    this.eventEmitter.on('invoice.created', (event) => {
      this.handleDataChangeEvent(event.organizationId, 'invoice_created');
    });

    this.eventEmitter.on('invoice.updated', (event) => {
      this.handleDataChangeEvent(event.organizationId, 'invoice_updated');
    });

    // Listen for payment events
    this.eventEmitter.on('payment.created', (event) => {
      this.handleDataChangeEvent(event.organizationId, 'payment_created');
    });

    // Listen for customer events
    this.eventEmitter.on('customer.created', (event) => {
      this.handleDataChangeEvent(event.organizationId, 'customer_created');
    });

    // Listen for expense events
    this.eventEmitter.on('expense.created', (event) => {
      this.handleDataChangeEvent(event.organizationId, 'expense_created');
    });

    this.logger.log('Dashboard real-time event listeners setup completed');
  }

  /**
   * Handle data change events
   */
  private async handleDataChangeEvent(organizationId: string, eventType: string): Promise<void> {
    try {
      // Invalidate relevant caches
      await this.cacheService.invalidateOrganizationCache(organizationId);
      
      // Emit dashboard data change event
      this.eventEmitter.emit('dashboard.data_changed', {
        organizationId,
        eventType,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.debug(`Handled data change event: ${eventType} for organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to handle data change event: ${error.message}`, error);
    }
  }

  /**
   * Get real-time statistics
   */
  getRealtimeStats(): {
    activeOrganizations: number;
    totalSubscriptions: number;
    updateIntervals: number;
  } {
    return {
      activeOrganizations: this.subscriptions.size,
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((total, dashboards) => total + dashboards.size, 0),
      updateIntervals: this.updateIntervals.size,
    };
  }

  /**
   * Cleanup resources on service shutdown
   */
  async cleanup(): Promise<void> {
    try {
      // Clear all intervals
      for (const interval of this.updateIntervals.values()) {
        clearInterval(interval);
      }
      
      this.updateIntervals.clear();
      this.subscriptions.clear();
      
      this.logger.log('Dashboard real-time service cleanup completed');
    } catch (error) {
      this.logger.error(`Failed to cleanup real-time service: ${error.message}`, error);
    }
  }

  /**
   * Set custom update interval for organization
   */
  setUpdateInterval(organizationId: string, intervalMs: number): void {
    try {
      // Stop existing interval
      this.stopRealtimeUpdates(organizationId);
      
      // Start with custom interval
      const interval = setInterval(async () => {
        await this.performRealtimeUpdate(organizationId);
      }, intervalMs);
      
      this.updateIntervals.set(organizationId, interval);
      this.logger.log(`Set custom update interval for organization: ${organizationId} (${intervalMs}ms)`);
    } catch (error) {
      this.logger.error(`Failed to set custom update interval: ${error.message}`, error);
    }
  }

  /**
   * Broadcast message to all dashboard subscribers
   */
  async broadcastMessage(organizationId: string, message: any): Promise<void> {
    try {
      this.eventEmitter.emit('dashboard.broadcast', {
        organizationId,
        message,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(`Broadcasted message to organization: ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast message: ${error.message}`, error);
    }
  }
}
