import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { UserStatus } from '@prisma/client';

import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import {
  LoginResponse,
  RegisterResponse,
} from './interfaces/auth.interface';

import { UsersService } from '../users/users.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailVerificationService } from './services/email-verification.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * User registration
   */
  async register(
    registerDto: RegisterDto,
    _ipAddress?: string,
    _userAgent?: string,
  ): Promise<RegisterResponse> {
    const { email, password, firstName, lastName, tenantId, phone } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmailAndTenant(email, tenantId);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Check for common passwords
    if (this.passwordService.isCommonPassword(password)) {
      throw new BadRequestException('Password is too common. Please choose a stronger password.');
    }

    // Hash password
    const hashedPassword = await this.passwordService.hashPassword(password);

    // Create user
    const user = await this.usersService.create(
      {
        email,
        firstName,
        lastName,
        tenantId,
        phone,
      },
      hashedPassword,
    );

    // Send email verification
    await this.emailVerificationService.sendEmailVerification(user.id);

    // Convert to authenticated user format
    const authenticatedUser = this.usersService.toAuthenticatedUser(user);

    return {
      user: authenticatedUser,
      message: 'Registration successful. Please check your email to verify your account.',
      verificationRequired: true,
    };
  }

  /**
   * User login
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: any,
  ): Promise<LoginResponse> {
    const { email, password, rememberMe } = loginDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const lockTimeRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (1000 * 60),
      );
      throw new UnauthorizedException(
        `Account is locked. Try again in ${lockTimeRemaining} minutes`,
      );
    }

    // Verify password
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.usersService.incrementFailedLoginAttempts(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Email not verified. Please check your email and verify your account.',
      );
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        `Account is ${user.status.toLowerCase()}. Please contact support.`,
      );
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id, ipAddress);

    // Convert to authenticated user format
    const authenticatedUser = this.usersService.toAuthenticatedUser(user);

    // Create session first to get the session ID
    const sessionId = crypto.randomUUID();

    // Generate tokens with the correct session ID
    const tokens = await this.tokenService.generateTokens(
      authenticatedUser,
      sessionId,
      rememberMe,
    );

    // Create session with the generated tokens
    await this.tokenService.createSession(
      user.id,
      tokens.refreshToken,
      ipAddress,
      userAgent,
      deviceInfo,
      rememberMe,
      sessionId, // Pass the session ID to ensure consistency
    );

    return {
      user: authenticatedUser,
      tokens,
      message: 'Login successful',
    };
  }

  /**
   * User logout
   */
  async logout(sessionId: string): Promise<{ message: string }> {
    await this.tokenService.revokeSession(sessionId);
    return { message: 'Logout successful' };
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.tokenService.revokeAllUserSessions(userId);
    return { message: 'Logged out from all devices' };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    const tokens = await this.tokenService.refreshAccessToken(refreshToken);
    return {
      tokens,
      message: 'Token refreshed successfully',
    };
  }

  /**
   * Forgot password
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    await this.emailVerificationService.sendPasswordResetEmail(email);
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;
    await this.emailVerificationService.resetPassword(token, newPassword);
    return { message: 'Password reset successful. Please login with your new password.' };
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.comparePassword(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Check if new password is different from current
    const isSamePassword = await this.passwordService.comparePassword(
      newPassword,
      user.password,
    );
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const hashedPassword = await this.passwordService.hashPassword(newPassword);

    // Update password
    await this.usersService.update(userId, { password: hashedPassword } as any);

    // Revoke all sessions except current one for security
    await this.tokenService.revokeAllUserSessions(userId);

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    await this.emailVerificationService.verifyEmail(token);
    return { message: 'Email verified successfully. You can now login.' };
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return { message: 'If an account with that email exists, a verification email has been sent.' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.emailVerificationService.sendEmailVerification(user.id);
    return { message: 'Verification email sent successfully.' };
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string) {
    return this.tokenService.getUserSessions(userId);
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    await this.tokenService.revokeSession(sessionId);
    return { message: 'Session revoked successfully' };
  }
}
