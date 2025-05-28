import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NotificationTemplate {
  type: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface NotificationData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  templateData?: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface InAppNotification {
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send email notification
   */
  async sendEmail(notification: NotificationData): Promise<void> {
    try {
      // For MVP, we'll log the notification
      // In production, integrate with email service (SendGrid, AWS SES, etc.)
      this.logger.log(`Email notification sent to: ${notification.to.join(', ')}`);
      this.logger.log(`Subject: ${notification.subject}`);
      this.logger.log(`Body: ${notification.body}`);

      // TODO: Implement actual email sending
      // Example with SendGrid:
      // await this.sendGridService.send({
      //   to: notification.to,
      //   from: this.configService.get('EMAIL_FROM'),
      //   subject: notification.subject,
      //   html: notification.body,
      // });
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send in-app notification
   */
  async sendInAppNotification(notification: InAppNotification): Promise<void> {
    try {
      // For MVP, we'll log the notification
      // In production, store in database and send via WebSocket
      this.logger.log(`In-app notification for user: ${notification.userId}`);
      this.logger.log(`Title: ${notification.title}`);
      this.logger.log(`Message: ${notification.message}`);

      // TODO: Implement actual in-app notification storage and delivery
      // Example:
      // await this.prisma.notification.create({
      //   data: {
      //     userId: notification.userId,
      //     title: notification.title,
      //     message: notification.message,
      //     type: notification.type,
      //     actionUrl: notification.actionUrl,
      //     metadata: notification.metadata,
      //   },
      // });
      //
      // await this.websocketGateway.sendToUser(notification.userId, {
      //   type: 'notification',
      //   data: notification,
      // });
    } catch (error) {
      this.logger.error(`Failed to send in-app notification: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send approval request notification
   */
  async sendApprovalRequestNotification(
    approverEmails: string[],
    requesterName: string,
    expenseDescription: string,
    amount: number,
    currency: string,
    approvalUrl: string,
  ): Promise<void> {
    const subject = `Expense Approval Required - ${expenseDescription}`;
    const body = this.generateApprovalRequestEmail(
      requesterName,
      expenseDescription,
      amount,
      currency,
      approvalUrl,
    );

    await this.sendEmail({
      to: approverEmails,
      subject,
      body,
      priority: 'NORMAL',
    });
  }

  /**
   * Send approval decision notification
   */
  async sendApprovalDecisionNotification(
    requesterEmail: string,
    approverName: string,
    expenseDescription: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string,
  ): Promise<void> {
    const subject = `Expense ${decision} - ${expenseDescription}`;
    const body = this.generateApprovalDecisionEmail(
      approverName,
      expenseDescription,
      decision,
      comments,
    );

    await this.sendEmail({
      to: [requesterEmail],
      subject,
      body,
      priority: decision === 'REJECTED' ? 'HIGH' : 'NORMAL',
    });
  }

  /**
   * Send approval reminder notification
   */
  async sendApprovalReminderNotification(
    approverEmails: string[],
    expenseDescription: string,
    daysPending: number,
    approvalUrl: string,
  ): Promise<void> {
    const subject = `Reminder: Expense Approval Pending - ${expenseDescription}`;
    const body = this.generateApprovalReminderEmail(
      expenseDescription,
      daysPending,
      approvalUrl,
    );

    await this.sendEmail({
      to: approverEmails,
      subject,
      body,
      priority: 'HIGH',
    });
  }

  /**
   * Send escalation notification
   */
  async sendEscalationNotification(
    escalationEmails: string[],
    originalApproverName: string,
    expenseDescription: string,
    amount: number,
    currency: string,
    approvalUrl: string,
  ): Promise<void> {
    const subject = `Escalated: Expense Approval Required - ${expenseDescription}`;
    const body = this.generateEscalationEmail(
      originalApproverName,
      expenseDescription,
      amount,
      currency,
      approvalUrl,
    );

    await this.sendEmail({
      to: escalationEmails,
      subject,
      body,
      priority: 'URGENT',
    });
  }

  /**
   * Generate approval request email template
   */
  private generateApprovalRequestEmail(
    requesterName: string,
    expenseDescription: string,
    amount: number,
    currency: string,
    approvalUrl: string,
  ): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Expense Approval Required</h2>
            
            <p>Hello,</p>
            
            <p><strong>${requesterName}</strong> has submitted an expense for your approval:</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Description:</strong> ${expenseDescription}</p>
              <p><strong>Amount:</strong> ${currency} ${amount.toLocaleString()}</p>
            </div>
            
            <p>Please review and approve or reject this expense by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approvalUrl}" 
                 style="background-color: #3498db; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Review Expense
              </a>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px;">
              This is an automated message from IntelliFin. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate approval decision email template
   */
  private generateApprovalDecisionEmail(
    approverName: string,
    expenseDescription: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string,
  ): string {
    const statusColor = decision === 'APPROVED' ? '#27ae60' : '#e74c3c';
    const statusText = decision === 'APPROVED' ? 'Approved' : 'Rejected';

    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${statusColor};">Expense ${statusText}</h2>
            
            <p>Hello,</p>
            
            <p>Your expense has been <strong style="color: ${statusColor};">${statusText.toLowerCase()}</strong> by <strong>${approverName}</strong>:</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Description:</strong> ${expenseDescription}</p>
              <p><strong>Status:</strong> <span style="color: ${statusColor};">${statusText}</span></p>
              ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
            </div>
            
            ${decision === 'REJECTED' ? 
              '<p>You can edit and resubmit your expense if needed.</p>' : 
              '<p>Your expense will now be processed for payment.</p>'
            }
            
            <p style="color: #7f8c8d; font-size: 14px;">
              This is an automated message from IntelliFin. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate approval reminder email template
   */
  private generateApprovalReminderEmail(
    expenseDescription: string,
    daysPending: number,
    approvalUrl: string,
  ): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f39c12;">Approval Reminder</h2>
            
            <p>Hello,</p>
            
            <p>This is a reminder that you have a pending expense approval:</p>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f39c12;">
              <p><strong>Description:</strong> ${expenseDescription}</p>
              <p><strong>Pending for:</strong> ${daysPending} day(s)</p>
            </div>
            
            <p>Please review this expense at your earliest convenience:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approvalUrl}" 
                 style="background-color: #f39c12; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Review Now
              </a>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px;">
              This is an automated message from IntelliFin. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate escalation email template
   */
  private generateEscalationEmail(
    originalApproverName: string,
    expenseDescription: string,
    amount: number,
    currency: string,
    approvalUrl: string,
  ): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c;">Escalated Expense Approval</h2>
            
            <p>Hello,</p>
            
            <p>An expense approval has been escalated to you due to no response from the original approver (<strong>${originalApproverName}</strong>):</p>
            
            <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e74c3c;">
              <p><strong>Description:</strong> ${expenseDescription}</p>
              <p><strong>Amount:</strong> ${currency} ${amount.toLocaleString()}</p>
              <p><strong>Original Approver:</strong> ${originalApproverName}</p>
            </div>
            
            <p>Please review and take action on this expense:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approvalUrl}" 
                 style="background-color: #e74c3c; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Review Escalated Expense
              </a>
            </div>
            
            <p style="color: #7f8c8d; font-size: 14px;">
              This is an automated message from IntelliFin. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get notification templates
   */
  getNotificationTemplates(): NotificationTemplate[] {
    return [
      {
        type: 'APPROVAL_REQUEST',
        subject: 'Expense Approval Required - {{expenseDescription}}',
        body: 'Approval request template',
        variables: ['requesterName', 'expenseDescription', 'amount', 'currency', 'approvalUrl'],
      },
      {
        type: 'APPROVAL_DECISION',
        subject: 'Expense {{decision}} - {{expenseDescription}}',
        body: 'Approval decision template',
        variables: ['approverName', 'expenseDescription', 'decision', 'comments'],
      },
      {
        type: 'APPROVAL_REMINDER',
        subject: 'Reminder: Expense Approval Pending - {{expenseDescription}}',
        body: 'Approval reminder template',
        variables: ['expenseDescription', 'daysPending', 'approvalUrl'],
      },
      {
        type: 'APPROVAL_ESCALATION',
        subject: 'Escalated: Expense Approval Required - {{expenseDescription}}',
        body: 'Approval escalation template',
        variables: ['originalApproverName', 'expenseDescription', 'amount', 'currency', 'approvalUrl'],
      },
    ];
  }
}
