import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ResendVerificationDto,
} from './dto/auth.dto';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/auth.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation errors' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    const deviceInfo = {
      userAgent,
      ip: ipAddress,
      timestamp: new Date(),
    };

    return this.authService.login(loginDto, ipAddress, userAgent, deviceInfo);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@CurrentUser() _user: AuthenticatedUser) {
    // Note: In a real implementation, you'd extract session ID from the token
    // For now, we'll use a placeholder
    const sessionId = 'current-session-id'; // This should be extracted from JWT or request
    return this.authService.logout(sessionId);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutAll(user.id);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('forgot-password')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('resend-verification')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiBody({ type: ResendVerificationDto })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendEmailVerification(resendVerificationDto.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getUserSessions(user.id);
  }

  @Post('sessions/:sessionId/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  async revokeSession(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.authService.revokeSession(sessionId);
  }
}
