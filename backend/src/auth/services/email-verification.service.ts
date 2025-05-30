import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../database/prisma.service';
import { PasswordService } from './password.service';
// import { EmailService } from '../../shared/services/email.service'; // Will be created later

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService
    // private readonly emailService: EmailService, // Will be uncommented later
  ) {}

  /**
   * Send email verification
   */
  async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate verification token
    const { token, hashedToken, expiresAt } =
      this.passwordService.generateEmailVerificationToken();

    // Update user with verification token
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: expiresAt,
      },
    });

    // Send verification email
    await this.sendVerificationEmail(user.email, user.firstName, token);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    const hashedToken = this.passwordService.hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        status: 'ACTIVE', // Activate user after email verification
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate reset token
    const { token, hashedToken, expiresAt } =
      this.passwordService.generatePasswordResetToken();

    // Update user with reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expiresAt,
      },
    });

    // Send reset email
    await this.sendResetPasswordEmail(user.email, user.firstName, token);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = this.passwordService.hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate password strength
    const passwordValidation =
      this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const hashedPassword = await this.passwordService.hashPassword(newPassword);

    // Update user password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        failedLoginAttempts: 0, // Reset failed attempts
        lockedUntil: null, // Unlock account if locked
      },
    });

    // Revoke all existing sessions for security
    await this.prisma.userSession.updateMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Send verification email (placeholder - will integrate with email service)
   */
  private async sendVerificationEmail(
    email: string,
    firstName: string,
    token: string
  ): Promise<void> {
    const verificationUrl = `${this.configService.get('app.frontendUrl')}/verify-email?token=${token}`;

    // TODO: Integrate with email service
    console.log(`Verification email for ${email}:`);
    console.log(
      `Hello ${firstName}, please verify your email: ${verificationUrl}`
    );

    // await this.emailService.sendEmail({
    //   to: email,
    //   subject: 'Verify your IntelliFin account',
    //   template: 'email-verification',
    //   context: {
    //     firstName,
    //     verificationUrl,
    //   },
    // });
  }

  /**
   * Send password reset email (placeholder - will integrate with email service)
   */
  private async sendResetPasswordEmail(
    email: string,
    firstName: string,
    token: string
  ): Promise<void> {
    const resetUrl = `${this.configService.get('app.frontendUrl')}/reset-password?token=${token}`;

    // TODO: Integrate with email service
    console.log(`Password reset email for ${email}:`);
    console.log(`Hello ${firstName}, reset your password: ${resetUrl}`);

    // await this.emailService.sendEmail({
    //   to: email,
    //   subject: 'Reset your IntelliFin password',
    //   template: 'password-reset',
    //   context: {
    //     firstName,
    //     resetUrl,
    //   },
    // });
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();

    await this.prisma.user.updateMany({
      where: {
        OR: [
          {
            emailVerificationExpires: {
              lt: now,
            },
          },
          {
            resetPasswordExpires: {
              lt: now,
            },
          },
        ],
      },
      data: {
        emailVerificationToken: null,
        emailVerificationExpires: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
  }
}
