import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StockAlertNotification {
  productId: string;
  organizationId: string;
  alertType: string;
  alertLevel: string;
  currentStock: number;
  thresholdValue: number;
  message: string;
}

export interface FullStockAlertNotification extends StockAlertNotification {
  id: string;
  createdAt: Date;
  product?: { // Assuming product details might be nested based on usage
    name: string;
    sku: string;
    unit: string;
  };
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  variables: Record<string, any>;
}

/**
 * Inventory Notification Service
 * Handles sending notifications for inventory-related events
 * Optimized for Zambian SME environments with multiple communication channels
 */
@Injectable()
export class InventoryNotificationService {
  private readonly logger = new Logger(InventoryNotificationService.name);
  private readonly isNotificationEnabled: boolean;

  // Notification templates for different alert types
  private readonly ALERT_TEMPLATES: Record<string, Partial<Record<'email' | 'sms' | 'push', NotificationTemplate>>> = {
    OUT_OF_STOCK: {
      email: {
        subject: '🚨 URGENT: Product Out of Stock - {{productName}}',
        body: `
          <h2>Product Out of Stock Alert</h2>
          <p><strong>Product:</strong> {{productName}} ({{productSku}})</p>
          <p><strong>Current Stock:</strong> {{currentStock}} {{unit}}</p>
          <p><strong>Status:</strong> OUT OF STOCK</p>
          <p><strong>Action Required:</strong> Immediate restocking needed</p>
          <p><strong>Time:</strong> {{alertTime}}</p>
          
          <p>Please take immediate action to restock this product to avoid sales disruption.</p>
          
          <p>Best regards,<br>IntelliFin Inventory System</p>
        `,
        variables: {},
      },
      sms: {
        subject: 'Stock Alert',
        body: 'URGENT: {{productName}} ({{productSku}}) is OUT OF STOCK. Immediate restocking required. - IntelliFin',
        variables: {},
      },
    },
    LOW_STOCK: {
      email: {
        subject: '⚠️ Low Stock Alert - {{productName}}',
        body: `
          <h2>Low Stock Alert</h2>
          <p><strong>Product:</strong> {{productName}} ({{productSku}})</p>
          <p><strong>Current Stock:</strong> {{currentStock}} {{unit}}</p>
          <p><strong>Minimum Stock:</strong> {{thresholdValue}} {{unit}}</p>
          <p><strong>Status:</strong> BELOW MINIMUM LEVEL</p>
          <p><strong>Time:</strong> {{alertTime}}</p>
          
          <p>This product has fallen below the minimum stock level. Consider reordering soon.</p>
          
          <p>Best regards,<br>IntelliFin Inventory System</p>
        `,
        variables: {},
      },
      sms: {
        subject: 'Stock Alert',
        body: 'LOW STOCK: {{productName}} ({{productSku}}) - {{currentStock}}/{{thresholdValue}} {{unit}}. Consider reordering. - IntelliFin',
        variables: {},
      },
    },
    REORDER_POINT: {
      email: {
        subject: '📦 Reorder Point Reached - {{productName}}',
        body: `
          <h2>Reorder Point Alert</h2>
          <p><strong>Product:</strong> {{productName}} ({{productSku}})</p>
          <p><strong>Current Stock:</strong> {{currentStock}} {{unit}}</p>
          <p><strong>Reorder Point:</strong> {{thresholdValue}} {{unit}}</p>
          <p><strong>Status:</strong> REORDER RECOMMENDED</p>
          <p><strong>Time:</strong> {{alertTime}}</p>
          
          <p>This product has reached its reorder point. Time to place a new order.</p>
          
          <p>Best regards,<br>IntelliFin Inventory System</p>
        `,
        variables: {},
      },
      sms: {
        subject: 'Reorder Alert',
        body: 'REORDER: {{productName}} ({{productSku}}) reached reorder point. Current: {{currentStock}} {{unit}}. - IntelliFin',
        variables: {},
      },
    },
    OVERSTOCK: {
      email: {
        subject: '📈 Overstock Alert - {{productName}}',
        body: `
          <h2>Overstock Alert</h2>
          <p><strong>Product:</strong> {{productName}} ({{productSku}})</p>
          <p><strong>Current Stock:</strong> {{currentStock}} {{unit}}</p>
          <p><strong>Maximum Stock:</strong> {{thresholdValue}} {{unit}}</p>
          <p><strong>Status:</strong> OVERSTOCKED</p>
          <p><strong>Time:</strong> {{alertTime}}</p>
          
          <p>This product is overstocked. Consider promotional activities or adjusting order quantities.</p>
          
          <p>Best regards,<br>IntelliFin Inventory System</p>
        `,
        variables: {},
      },
      sms: {
        subject: 'Overstock Alert',
        body: 'OVERSTOCK: {{productName}} ({{productSku}}) - {{currentStock}}/{{thresholdValue}} {{unit}}. Consider promotion. - IntelliFin',
        variables: {},
      },
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.isNotificationEnabled =
      this.configService.get<boolean>('notifications.enabled') || false;
  }

  /**
   * Send stock alert notification
   */
  async sendStockAlert(
    alert: StockAlertNotification,
    recipients: string[],
    channel: 'email' | 'sms' | 'push'
  ): Promise<boolean> {
    try {
      if (!this.isNotificationEnabled) {
        this.logger.debug('Notifications disabled - skipping stock alert');
        return false;
      }

      if (recipients.length === 0) {
        this.logger.warn('No recipients provided for stock alert');
        return false;
      }

      // Get notification template
      const template = this.getAlertTemplate(alert.alertType, channel);
      if (!template) {
        this.logger.warn(
          `No template found for alert type ${alert.alertType} and channel ${channel}`
        );
        return false;
      }

      // Prepare template variables
      const variables = await this.prepareTemplateVariables(alert);

      // Render template
      const renderedTemplate = this.renderTemplate(template, variables);

      // Send notification based on channel
      switch (channel) {
        case 'email':
          return await this.sendEmailNotification(recipients, renderedTemplate);
        case 'sms':
          return await this.sendSmsNotification(recipients);
        case 'push':
          return await this.sendPushNotification(recipients);
        default:
          this.logger.warn(`Unsupported notification channel: ${channel}`);
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to send stock alert notification: ${(error as Error).message}`,
        error
      );
      return false;
    }
  }

  /**
   * Send alert escalation
   */
  async sendAlertEscalation(
    alert: FullStockAlertNotification,
    organizationId: string
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Sending alert escalation for alert ${alert.id} in organization ${organizationId}`
      );

      // Get escalation recipients (managers, admins)
      const escalationRecipients =
        await this.getEscalationRecipients();

      if (escalationRecipients.length === 0) {
        this.logger.warn(
          `No escalation recipients found for organization ${organizationId}`
        );
        return false;
      }

      // Prepare escalation message
      const escalationTemplate: NotificationTemplate = {
        subject: '🚨 ESCALATED: Unacknowledged Stock Alert - {{productName}}',
        body: `
          <h2>Escalated Stock Alert</h2>
          <p><strong>Alert ID:</strong> {{alertId}}</p>
          <p><strong>Product:</strong> {{productName}} ({{productSku}})</p>
          <p><strong>Alert Type:</strong> {{alertType}}</p>
          <p><strong>Alert Level:</strong> {{alertLevel}}</p>
          <p><strong>Current Stock:</strong> {{currentStock}} {{unit}}</p>
          <p><strong>Alert Created:</strong> {{alertCreated}}</p>
          <p><strong>Hours Unacknowledged:</strong> {{hoursUnacknowledged}}</p>
          
          <p><strong>This alert has been unacknowledged for an extended period and requires immediate attention.</strong></p>
          
          <p>Please log into the system to acknowledge and address this alert.</p>
          
          <p>Best regards,<br>IntelliFin Inventory System</p>
        `,
        variables: {},
      };

      const variables = {
        alertId: alert.id,
        productName: alert.product?.name || 'Unknown Product',
        productSku: alert.product?.sku || 'Unknown SKU',
        alertType: alert.alertType,
        alertLevel: alert.alertLevel,
        currentStock: alert.currentStock,
        unit: alert.product?.unit || 'units',
        alertCreated: alert.createdAt.toLocaleString(),
        hoursUnacknowledged: Math.round(
          (Date.now() - alert.createdAt.getTime()) / (1000 * 60 * 60)
        ),
      };

      const renderedTemplate = this.renderTemplate(
        escalationTemplate,
        variables
      );

      // Send escalation via email (high priority)
      return await this.sendEmailNotification(
        escalationRecipients,
        renderedTemplate
      );
    } catch (error) {
      this.logger.error(
        `Failed to send alert escalation: ${(error as Error).message}`,
        error
      );
      return false;
    }
  }

  /**
   * Send bulk notification summary
   */
  async sendBulkNotificationSummary(
    organizationId: string,
    alerts: FullStockAlertNotification[],
    recipients: string[]
  ): Promise<boolean> {
    try {
      if (alerts.length === 0) {
        return true;
      }

      const summaryTemplate: NotificationTemplate = {
        subject: '📊 Daily Stock Alert Summary - {{alertCount}} Alerts',
        body: `
          <h2>Daily Stock Alert Summary</h2>
          <p><strong>Date:</strong> {{date}}</p>
          <p><strong>Total Alerts:</strong> {{alertCount}}</p>
          
          <h3>Alert Breakdown:</h3>
          <ul>
            <li>Critical: {{criticalCount}}</li>
            <li>Urgent: {{urgentCount}}</li>
            <li>Warning: {{warningCount}}</li>
            <li>Info: {{infoCount}}</li>
          </ul>
          
          <h3>Alert Types:</h3>
          <ul>
            <li>Out of Stock: {{outOfStockCount}}</li>
            <li>Low Stock: {{lowStockCount}}</li>
            <li>Reorder Point: {{reorderCount}}</li>
            <li>Overstock: {{overstockCount}}</li>
          </ul>
          
          <p>Please review and address these alerts in the IntelliFin system.</p>
          
          <p>Best regards,<br>IntelliFin Inventory System</p>
        `,
        variables: {},
      };

      const variables = {
        date: new Date().toLocaleDateString(),
        alertCount: alerts.length,
        criticalCount: alerts.filter(a => a.alertLevel === 'CRITICAL').length,
        urgentCount: alerts.filter(a => a.alertLevel === 'URGENT').length,
        warningCount: alerts.filter(a => a.alertLevel === 'WARNING').length,
        infoCount: alerts.filter(a => a.alertLevel === 'INFO').length,
        outOfStockCount: alerts.filter(a => a.alertType === 'OUT_OF_STOCK')
          .length,
        lowStockCount: alerts.filter(a => a.alertType === 'LOW_STOCK').length,
        reorderCount: alerts.filter(a => a.alertType === 'REORDER_POINT')
          .length,
        overstockCount: alerts.filter(a => a.alertType === 'OVERSTOCK').length,
      };

      const renderedTemplate = this.renderTemplate(summaryTemplate, variables);

      return await this.sendEmailNotification(recipients, renderedTemplate);
    } catch (error) {
      this.logger.error(
        `Failed to send bulk notification summary: ${(error as Error).message}`,
        error
      );
      return false;
    }
  }

  /**
   * Get alert template for specific type and channel
   */
  private getAlertTemplate(alertType: string, channel: string): NotificationTemplate | undefined {
    const templates =
      this.ALERT_TEMPLATES[alertType as keyof typeof this.ALERT_TEMPLATES];
    return templates?.[channel as keyof typeof templates];
  }

  /**
   * Prepare template variables
   */
  private async prepareTemplateVariables(
    alert: StockAlertNotification
  ): Promise<Record<string, any>> {
    // In a real implementation, this would fetch product details
    return {
      productName: 'Product Name', // Would fetch from product service
      productSku: 'SKU-001', // Would fetch from product service
      currentStock: alert.currentStock,
      thresholdValue: alert.thresholdValue,
      unit: 'pcs', // Would fetch from product service
      alertTime: new Date().toLocaleString(),
      alertType: alert.alertType,
      alertLevel: alert.alertLevel,
    };
  }

  /**
   * Render template with variables
   */
  private renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>
  ): NotificationTemplate {
    let subject = template.subject;
    let body = template.body;

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return {
      subject,
      body,
      variables,
    };
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    recipients: string[],
    template: NotificationTemplate
  ): Promise<boolean> {
    try {
      // In a real implementation, this would use the email service
      this.logger.log(
        `Sending email notification to ${recipients.length} recipients: ${template.subject}`
      );

      // Mock email sending
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email notification: ${(error as Error).message}`,
        error
      );
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(
    recipients: string[]
  ): Promise<boolean> {
    try {
      // In a real implementation, this would use an SMS service
      this.logger.log(
        `Sending SMS notification to ${recipients.length} recipients`
      );

      // Mock SMS sending
      await new Promise(resolve => setTimeout(resolve, 200));

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send SMS notification: ${(error as Error).message}`,
        error
      );
      return false;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    recipients: string[]
  ): Promise<boolean> {
    try {
      // In a real implementation, this would use a push notification service
      this.logger.log(
        `Sending push notification to ${recipients.length} recipients`
      );

      // Mock push notification sending
      await new Promise(resolve => setTimeout(resolve, 50));

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send push notification: ${(error as Error).message}`,
        error
      );
      return false;
    }
  }

  /**
   * Get escalation recipients
   */
  private async getEscalationRecipients(
  ): Promise<string[]> {
    // In a real implementation, this would fetch managers and admins
    return ['manager@example.com', 'admin@example.com'];
  }
}
