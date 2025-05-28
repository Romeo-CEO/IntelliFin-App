import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailVerificationService } from './services/email-verification.service';

import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
          issuer: configService.get<string>('jwt.issuer'),
          audience: configService.get<string>('jwt.audience'),
          algorithm: configService.get<string>('jwt.algorithm') as any,
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule,
    UsersModule,
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PasswordService,
    TokenService,
    EmailVerificationService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PasswordService,
    TokenService,
  ],
})
export class AuthModule {}
