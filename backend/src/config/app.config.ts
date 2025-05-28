import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME || 'IntelliFin',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  timezone: process.env.TZ || 'Africa/Lusaka',
  locale: process.env.LOCALE || 'en',
  debug: process.env.DEBUG === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '52428800', 10), // 50MB
  sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  cookieSecret: process.env.COOKIE_SECRET || 'your-cookie-secret-change-in-production',
  encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production',
  rateLimiting: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10), // seconds
    limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10), // requests
    authTtl: parseInt(process.env.AUTH_RATE_LIMIT_TTL || '60', 10), // seconds
    authLimit: parseInt(process.env.AUTH_RATE_LIMIT_LIMIT || '5', 10), // requests
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    passwordMaxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '30', 10), // minutes
    tokenExpiry: process.env.TOKEN_EXPIRY || '1h',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },
  features: {
    emailVerification: process.env.EMAIL_VERIFICATION_ENABLED !== 'false',
    phoneVerification: process.env.PHONE_VERIFICATION_ENABLED === 'true',
    twoFactorAuth: process.env.TWO_FACTOR_AUTH_ENABLED === 'true',
    socialLogin: process.env.SOCIAL_LOGIN_ENABLED === 'true',
    fileUploads: process.env.FILE_UPLOADS_ENABLED !== 'false',
    notifications: process.env.NOTIFICATIONS_ENABLED !== 'false',
    analytics: process.env.ANALYTICS_ENABLED === 'true',
    maintenance: process.env.MAINTENANCE_MODE === 'true',
  },
}));
