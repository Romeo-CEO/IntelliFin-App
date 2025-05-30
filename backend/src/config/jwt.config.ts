import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret:
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET  }-refresh`,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  issuer: process.env.JWT_ISSUER || 'intellifin.com',
  audience: process.env.JWT_AUDIENCE || 'intellifin-users',
  algorithm: process.env.JWT_ALGORITHM || 'HS256',
}));
