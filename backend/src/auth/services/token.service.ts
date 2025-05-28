import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

import {
  JwtPayload,
  RefreshTokenPayload,
  AuthTokens,
  AuthenticatedUser,
} from '../interfaces/auth.interface';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate access and refresh tokens for a user
   */
  async generateTokens(
    user: AuthenticatedUser,
    sessionId?: string,
    rememberMe: boolean = false,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      status: user.status,
    };

    const accessTokenExpiresIn = rememberMe ? '7d' : '1h';
    const refreshTokenExpiresIn = rememberMe ? '30d' : '7d';

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiresIn,
    });

    // Generate refresh token
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sessionId: sessionId || crypto.randomUUID(),
      tokenVersion: 1, // For token rotation
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: refreshTokenExpiresIn,
    });

    // Calculate expiration time in seconds
    const expiresIn = rememberMe ? 7 * 24 * 60 * 60 : 60 * 60; // 7 days or 1 hour

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify and decode an access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Verify and decode a refresh token
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const refreshPayload = await this.verifyRefreshToken(refreshToken);

    // Get user session
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: refreshPayload.sessionId,
        userId: refreshPayload.sub,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    // Check if user is still active
    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    // Generate new tokens
    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role,
      status: session.user.status,
      tenantId: session.user.tenantId,
      emailVerified: session.user.emailVerified,
      phoneVerified: session.user.phoneVerified,
      lastLoginAt: session.user.lastLoginAt,
      settings: session.user.settings,
      timezone: session.user.timezone,
      language: session.user.language,
    };

    const newTokens = await this.generateTokens(user, session.id);

    // Update session with new refresh token
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newTokens.refreshToken,
        updatedAt: new Date(),
      },
    });

    return newTokens;
  }

  /**
   * Create a new user session
   */
  async createSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: any,
    rememberMe: boolean = false,
    sessionId?: string, // Optional session ID to ensure consistency
  ): Promise<string> {
    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    }

    const session = await this.prisma.userSession.create({
      data: {
        id: sessionId, // Use provided session ID if available
        userId,
        token: crypto.randomUUID(),
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
        deviceInfo,
        isActive: true,
      },
    });

    return session.id;
  }

  /**
   * Revoke a user session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        deviceInfo: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}
