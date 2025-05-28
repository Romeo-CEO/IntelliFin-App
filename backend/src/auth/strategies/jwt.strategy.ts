import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload, AuthenticatedUser } from '../interfaces/auth.interface';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      issuer: configService.get<string>('jwt.issuer'),
      audience: configService.get<string>('jwt.audience'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const { sub: userId, email, tenantId } = payload;

    // Validate payload structure
    if (!userId || !email || !tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Get user from database to ensure they still exist and are active
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        `User account is ${user.status.toLowerCase()}`,
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    // Check if user belongs to the tenant in the token
    if (user.tenantId !== tenantId) {
      throw new UnauthorizedException('Invalid tenant access');
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

    // Return authenticated user object
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastLoginAt: user.lastLoginAt,
      settings: user.settings,
      timezone: user.timezone,
      language: user.language,
    };
  }
}
