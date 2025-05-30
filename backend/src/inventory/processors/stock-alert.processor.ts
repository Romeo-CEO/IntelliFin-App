import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { StockAlertRepository } from '../alerts/stock-alert.repository';
import { InventoryNotificationService } from '../services/inventory-notification.service';
import { InventoryCacheService } from '../services/inventory-cache.service';

export interface StockAlertJobData {
  alert: {
    productId: string;
    organizationId: string;
    alertType: string;
    alertLevel: string;
    currentStock: number;
    thresholdValue: number;
    message: string;
  };
}

export interface NotificationJobData {
  organizationId: string;
  alertId: string;
  recipients?: string[];
  channels?: ('email' | 'sms' | 'push')[];
}

export interface AlertCleanupJobData {
  organizationId: string;
  daysOld?: number;
}

/**
 * Stock Alert Processor
 * Handles background processing of stock alerts and notifications
 * Optimized for Zambian SME environments with reliable alert delivery
 */
@Processor('stock-alerts')
@Injectable()
export class StockAlertProcessor {
  private readonly logger = new Logger(StockAlertProcessor.name);

  constructor(
    private readonly stockAlertRepository: StockAlertRepository,
    private readonly notificationService: InventoryNotificationService,
    private readonly cacheService: InventoryCacheService
  ) {}

  /**
   * Send stock alert notification
   */
  @Process('send-stock-alert-notification')
  async sendStockAlertNotification(job: Job<StockAlertJobData>) {
    const { alert } = job.data;

    try {
      this.logger.log(
        `Sending stock alert notification for product ${alert.productId}: ${alert.alertType}`
      );

      // Get organization notification preferences
      const notificationPrefs = await this.getNotificationPreferences(
        alert.organizationId
      );

      if (!notificationPrefs.enabled) {
        this.logger.debug(
          `Notifications disabled for organization ${alert.organizationId}`
        );
        return;
      }

      // Determine notification channels based on alert level
      const channels = this.getNotificationChannels(
        alert.alertLevel,
        notificationPrefs
      );

      if (channels.length === 0) {
        this.logger.debug(
          `No notification channels configured for alert level ${alert.alertLevel}`
        );
        return;
      }

      // Get recipients
      const recipients = await this.getAlertRecipients(
        alert.organizationId,
        alert.alertType
      );

      if (recipients.length === 0) {
        this.logger.warn(
          `No recipients found for stock alerts in organization ${alert.organizationId}`
        );
        return;
      }

      // Send notifications through each channel
      const notificationResults = await Promise.allSettled(
        channels.map(channel =>
          this.notificationService.sendStockAlert(alert, recipients, channel)
        )
      );

      // Log results
      let successCount = 0;
      let failureCount = 0;

      notificationResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
          this.logger.debug(
            `Stock alert sent via ${channels[index]}: ${result.value}`
          );
        } else {
          failureCount++;
          this.logger.error(
            `Failed to send stock alert via ${channels[index]}: ${result.reason}`
          );
        }
      });

      // Update alert with notification tracking
      if (successCount > 0) {
        await this.updateAlertNotificationTracking(alert, successCount);
      }

      this.logger.log(
        `Stock alert notification completed: ${successCount} successful, ${failureCount} failed`
      );

      // Update job progress
      await job.progress(100);
    } catch (error) {
      this.logger.error(
        `Failed to send stock alert notification: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Process batch alert notifications
   */
  @Process('batch-alert-notifications')
  async processBatchAlertNotifications(
    job: Job<{ organizationId: string; alertIds: string[] }>
  ) {
    const { organizationId, alertIds } = job.data;

    try {
      this.logger.log(
        `Processing batch alert notifications for ${alertIds.length} alerts in organization ${organizationId}`
      );

      const totalAlerts = alertIds.length;
      let processedCount = 0;

      for (const alertId of alertIds) {
        try {
          // Get alert details
          const alert = await this.stockAlertRepository.findById(
            alertId,
            organizationId
          );

          if (!alert || alert.isAcknowledged) {
            this.logger.debug(
              `Skipping alert ${alertId} - not found or already acknowledged`
            );
            continue;
          }

          // Send notification
          await this.sendStockAlertNotification({
            data: { alert: alert as any },
          } as Job<StockAlertJobData>);

          processedCount++;

          // Update job progress
          const progress = Math.round((processedCount / totalAlerts) * 100);
          await job.progress(progress);

          // Small delay to prevent overwhelming notification services
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          this.logger.error(
            `Failed to process alert ${alertId}: ${error.message}`,
            error
          );
          // Continue with other alerts
        }
      }

      this.logger.log(
        `Batch alert notifications completed: ${processedCount}/${totalAlerts} alerts processed`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process batch alert notifications: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Clean up old acknowledged alerts
   */
  @Process('cleanup-old-alerts')
  async cleanupOldAlerts(job: Job<AlertCleanupJobData>) {
    const { organizationId, daysOld = 30 } = job.data;

    try {
      this.logger.log(
        `Cleaning up alerts older than ${daysOld} days for organization ${organizationId}`
      );

      const deletedCount =
        await this.stockAlertRepository.deleteOldAcknowledgedAlerts(
          organizationId,
          daysOld
        );

      // Invalidate cache
      await this.cacheService.invalidateStockAlertCache(organizationId);

      this.logger.log(
        `Alert cleanup completed: ${deletedCount} old alerts deleted`
      );

      return { deletedCount };
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old alerts: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Generate alert summary report
   */
  @Process('generate-alert-summary')
  async generateAlertSummary(
    job: Job<{ organizationId: string; period: 'daily' | 'weekly' | 'monthly' }>
  ) {
    const { organizationId, period } = job.data;

    try {
      this.logger.log(
        `Generating ${period} alert summary for organization ${organizationId}`
      );

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case 'daily':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Get alert statistics
      const alertStats =
        await this.stockAlertRepository.getAlertStats(organizationId);

      // Get recent alerts
      const recentAlerts = await this.stockAlertRepository.findMany(
        {
          organizationId,
          isActive: true,
        },
        { createdAt: 'desc' },
        0,
        50
      );

      const summary = {
        period,
        organizationId,
        generatedAt: new Date(),
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        statistics: alertStats,
        recentAlerts: recentAlerts.map(alert => ({
          id: alert.id,
          productId: alert.productId,
          alertType: alert.alertType,
          alertLevel: alert.alertLevel,
          message: alert.message,
          createdAt: alert.createdAt,
          isAcknowledged: alert.isAcknowledged,
        })),
      };

      // Cache the summary
      const cacheKey = `alert_summary_${organizationId}_${period}`;
      await this.cacheService.set(cacheKey, summary, 3600); // 1 hour

      this.logger.log(
        `Alert summary generated for organization ${organizationId}`
      );

      return summary;
    } catch (error) {
      this.logger.error(
        `Failed to generate alert summary: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Process alert escalation
   */
  @Process('escalate-alerts')
  async escalateAlerts(
    job: Job<{ organizationId: string; hoursUnacknowledged: number }>
  ) {
    const { organizationId, hoursUnacknowledged = 24 } = job.data;

    try {
      this.logger.log(
        `Processing alert escalation for organization ${organizationId} (${hoursUnacknowledged}h threshold)`
      );

      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursUnacknowledged);

      // Find unacknowledged critical/urgent alerts older than threshold
      const escalationAlerts = await this.stockAlertRepository.findMany(
        {
          organizationId,
          isActive: true,
          isAcknowledged: false,
        },
        { createdAt: 'asc' }
      );

      const alertsToEscalate = escalationAlerts.filter(
        alert =>
          (alert.alertLevel === 'CRITICAL' || alert.alertLevel === 'URGENT') &&
          alert.createdAt < cutoffDate
      );

      if (alertsToEscalate.length === 0) {
        this.logger.debug(
          `No alerts require escalation for organization ${organizationId}`
        );
        return;
      }

      // Send escalation notifications
      for (const alert of alertsToEscalate) {
        try {
          await this.notificationService.sendAlertEscalation(
            alert,
            organizationId
          );

          // Update alert with escalation tracking
          await this.stockAlertRepository.update(alert.id, organizationId, {
            notificationsSent: alert.notificationsSent + 1,
            lastNotificationAt: new Date(),
          });
        } catch (error) {
          this.logger.error(
            `Failed to escalate alert ${alert.id}: ${error.message}`,
            error
          );
        }
      }

      this.logger.log(
        `Alert escalation completed: ${alertsToEscalate.length} alerts escalated`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process alert escalation: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get notification preferences for organization
   */
  private async getNotificationPreferences(
    organizationId: string
  ): Promise<any> {
    // In a real implementation, this would fetch from organization settings
    return {
      enabled: true,
      channels: {
        email: true,
        sms: false,
        push: true,
      },
      alertLevels: {
        critical: ['email', 'sms', 'push'],
        urgent: ['email', 'push'],
        warning: ['email'],
        info: [],
      },
    };
  }

  /**
   * Get notification channels based on alert level
   */
  private getNotificationChannels(
    alertLevel: string,
    preferences: any
  ): string[] {
    const levelChannels =
      preferences.alertLevels[alertLevel.toLowerCase()] || [];
    return levelChannels.filter(
      (channel: string) => preferences.channels[channel]
    );
  }

  /**
   * Get alert recipients for organization
   */
  private async getAlertRecipients(
    organizationId: string,
    alertType: string
  ): Promise<string[]> {
    // In a real implementation, this would fetch from user roles and preferences
    // For now, return mock recipients
    return ['admin@example.com', 'manager@example.com'];
  }

  /**
   * Update alert notification tracking
   */
  private async updateAlertNotificationTracking(
    alert: any,
    successCount: number
  ): Promise<void> {
    try {
      // Find the actual alert in database and update tracking
      const existingAlert = await this.stockAlertRepository.findActiveAlert(
        alert.organizationId,
        alert.productId,
        alert.alertType as any
      );

      if (existingAlert) {
        await this.stockAlertRepository.update(
          existingAlert.id,
          alert.organizationId,
          {
            notificationsSent: existingAlert.notificationsSent + successCount,
            lastNotificationAt: new Date(),
          }
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update alert notification tracking: ${error.message}`,
        error
      );
    }
  }
}
