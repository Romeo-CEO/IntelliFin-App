import { registerAs } from '@nestjs/config';

export const securityConfig = registerAs('security', () => ({
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Tenant-ID',
      'X-API-Key',
      'X-Request-ID',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  // Helmet Security Headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'https://api.intellifin.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  },

  // Rate Limiting
  rateLimiting: {
    global: {
      ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000, // Convert to milliseconds
      limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10),
    },
    auth: {
      ttl: parseInt(process.env.AUTH_RATE_LIMIT_TTL || '60', 10) * 1000,
      limit: parseInt(process.env.AUTH_RATE_LIMIT_LIMIT || '5', 10),
    },
    api: {
      ttl: parseInt(process.env.API_RATE_LIMIT_TTL || '60', 10) * 1000,
      limit: parseInt(process.env.API_RATE_LIMIT_LIMIT || '1000', 10),
    },
    upload: {
      ttl: parseInt(process.env.UPLOAD_RATE_LIMIT_TTL || '60', 10) * 1000,
      limit: parseInt(process.env.UPLOAD_RATE_LIMIT_LIMIT || '10', 10),
    },
  },

  // Session Configuration
  session: {
    secret:
      process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' as const,
    },
    name: 'intellifin.sid',
  },

  // Cookie Configuration
  cookies: {
    secret:
      process.env.COOKIE_SECRET || 'your-cookie-secret-change-in-production',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },

  // CSRF Protection
  csrf: {
    enabled: process.env.CSRF_ENABLED !== 'false',
    cookieName: 'intellifin-csrf-token',
    headerName: 'x-csrf-token',
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    cookie: {
      httpOnly: false, // CSRF token needs to be accessible to frontend
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    },
  },

  // File Upload Security
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    maxFiles: parseInt(process.env.MAX_FILES_PER_REQUEST || '5', 10),
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    scanForViruses: process.env.VIRUS_SCAN_ENABLED === 'true',
    quarantinePath: process.env.QUARANTINE_PATH || './quarantine',
  },

  // API Security
  api: {
    enableApiKey: process.env.API_KEY_ENABLED === 'true',
    apiKeyHeader: 'x-api-key',
    enableRequestId: true,
    requestIdHeader: 'x-request-id',
    enableUserAgent: true,
    enableIpLogging: true,
    trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
  },

  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    key:
      process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production',
    ivLength: 16,
    tagLength: 16,
  },

  // Password Policy
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128', 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
    preventCommonPasswords: process.env.PASSWORD_PREVENT_COMMON !== 'false',
    preventUserInfo: process.env.PASSWORD_PREVENT_USER_INFO !== 'false',
    historyCount: parseInt(process.env.PASSWORD_HISTORY_COUNT || '5', 10),
    expiryDays: parseInt(process.env.PASSWORD_EXPIRY_DAYS || '90', 10),
  },

  // Account Security
  account: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration:
      parseInt(process.env.LOCKOUT_DURATION || '30', 10) * 60 * 1000, // Convert to milliseconds
    unlockAfterSuccess: process.env.UNLOCK_AFTER_SUCCESS !== 'false',
    requireEmailVerification:
      process.env.EMAIL_VERIFICATION_ENABLED !== 'false',
    requirePhoneVerification: process.env.PHONE_VERIFICATION_ENABLED === 'true',
    enableTwoFactor: process.env.TWO_FACTOR_AUTH_ENABLED === 'true',
    sessionTimeout:
      parseInt(process.env.SESSION_TIMEOUT || '60', 10) * 60 * 1000, // Convert to milliseconds
    maxConcurrentSessions: parseInt(
      process.env.MAX_CONCURRENT_SESSIONS || '5',
      10
    ),
  },

  // Audit and Logging
  audit: {
    enableAuditLog: process.env.AUDIT_LOG_ENABLED !== 'false',
    logFailedLogins: process.env.LOG_FAILED_LOGINS !== 'false',
    logSuccessfulLogins: process.env.LOG_SUCCESSFUL_LOGINS !== 'false',
    logPasswordChanges: process.env.LOG_PASSWORD_CHANGES !== 'false',
    logRoleChanges: process.env.LOG_ROLE_CHANGES !== 'false',
    logDataAccess: process.env.LOG_DATA_ACCESS === 'true',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10),
  },

  // IP Security
  ip: {
    enableWhitelist: process.env.IP_WHITELIST_ENABLED === 'true',
    whitelist: process.env.IP_WHITELIST?.split(',') || [],
    enableBlacklist: process.env.IP_BLACKLIST_ENABLED === 'true',
    blacklist: process.env.IP_BLACKLIST?.split(',') || [],
    enableGeoBlocking: process.env.GEO_BLOCKING_ENABLED === 'true',
    allowedCountries: process.env.ALLOWED_COUNTRIES?.split(',') || ['ZM'], // Zambia by default
    blockedCountries: process.env.BLOCKED_COUNTRIES?.split(',') || [],
  },
}));
