import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

interface InvitationEmailData {
  to: string;
  inviterName: string;
  organizationName: string;
  role: UserRole;
  invitationUrl: string;
  message?: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendInvitationEmail(data: InvitationEmailData): Promise<void> {
    this.logger.log(`Sending invitation email to ${data.to}`);

    try {
      // In a real implementation, this would use a service like SendGrid, AWS SES, etc.
      // For now, we'll just log the email content
      const emailContent = this.generateInvitationEmailContent(data);

      this.logger.log(`Email content for ${data.to}:`);
      this.logger.log(emailContent);

      // TODO: Implement actual email sending
      // await this.sendEmail({
      //   to: data.to,
      //   subject: `Invitation to join ${data.organizationName} on IntelliFin`,
      //   html: emailContent,
      // });
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email to ${data.to}: ${error.message}`
      );
      throw error;
    }
  }

  private generateInvitationEmailContent(data: InvitationEmailData): string {
    const roleDisplayName = this.getRoleDisplayName(data.role);
    const expiryDate = data.expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to join ${data.organizationName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #005FAD, #00A99D);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e1e5e9;
            border-top: none;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border: 1px solid #e1e5e9;
            border-top: none;
            border-radius: 0 0 8px 8px;
            font-size: 14px;
            color: #6c757d;
        }
        .btn {
            display: inline-block;
            background: #005FAD;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .btn:hover {
            background: #004a8a;
        }
        .info-box {
            background: #f8f9fa;
            border-left: 4px solid #00A99D;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 You're Invited!</h1>
        <p>Join ${data.organizationName} on IntelliFin</p>
    </div>
    
    <div class="content">
        <h2>Hello!</h2>
        
        <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on IntelliFin as a <strong>${roleDisplayName}</strong>.</p>
        
        ${
          data.message
            ? `
        <div class="info-box">
            <h4>Personal Message:</h4>
            <p><em>"${data.message}"</em></p>
        </div>
        `
            : ''
        }
        
        <p>IntelliFin is a comprehensive financial management platform designed specifically for Zambian SMEs and Mobile Money Agents. With IntelliFin, you can:</p>
        
        <ul>
            <li>📊 Manage invoices and payments</li>
            <li>💰 Track expenses and income</li>
            <li>📱 Integrate with mobile money services</li>
            <li>📈 Generate financial reports</li>
            <li>🏛️ Ensure ZRA compliance</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${data.invitationUrl}" class="btn">Accept Invitation</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
            ${data.invitationUrl}
        </p>
        
        <div class="warning-box">
            <h4>⏰ Important:</h4>
            <p>This invitation expires on <strong>${expiryDate}</strong>. Please accept it before then to join the team.</p>
        </div>
        
        <h3>What happens next?</h3>
        <ol>
            <li>Click the "Accept Invitation" button above</li>
            <li>Create your account with a secure password</li>
            <li>Complete your profile setup</li>
            <li>Start collaborating with your team!</li>
        </ol>
        
        <p>If you have any questions or need help getting started, feel free to reach out to ${data.inviterName} or our support team.</p>
        
        <p>Welcome to the IntelliFin family! 🚀</p>
    </div>
    
    <div class="footer">
        <p>This invitation was sent by ${data.inviterName} from ${data.organizationName}.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        <p>© ${new Date().getFullYear()} IntelliFin by PoshyTrends Digital Solutions. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim();
  }

  private getRoleDisplayName(role: UserRole): string {
    const roleMap = {
      [UserRole.SUPER_ADMIN]: 'Super Administrator',
      [UserRole.TENANT_ADMIN]: 'Organization Administrator',
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.MANAGER]: 'Manager',
      [UserRole.USER]: 'User',
      [UserRole.VIEWER]: 'Viewer',
    };

    return roleMap[role] || role;
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    this.logger.log(`Sending welcome email to ${to}`);
    // TODO: Implement welcome email
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    this.logger.log(`Sending password reset email to ${to}`);
    // TODO: Implement password reset email
  }

  async sendEmailVerificationEmail(
    to: string,
    verificationUrl: string
  ): Promise<void> {
    this.logger.log(`Sending email verification email to ${to}`);
    // TODO: Implement email verification email
  }
}
