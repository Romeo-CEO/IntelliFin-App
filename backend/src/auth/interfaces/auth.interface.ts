import { UserRole, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  tenantId: string;
  role: UserRole;
  status: UserStatus;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date;
  settings?: any;
  timezone?: string;
  language?: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  tokens: AuthTokens;
  message: string;
}

export interface RegisterResponse {
  user: Omit<AuthenticatedUser, 'lastLoginAt'>;
  message: string;
  verificationRequired: boolean;
}

export interface PasswordResetRequest {
  email: string;
  token: string;
  expiresAt: Date;
}

export interface EmailVerificationRequest {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecuritySettings {
  maxFailedAttempts: number;
  lockoutDuration: number; // in minutes
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  sessionTimeout: number; // in minutes
  refreshTokenExpiry: number; // in days
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  total: number;
}

export interface AuthContext {
  user: AuthenticatedUser;
  session: SessionInfo;
  tenant: {
    id: string;
    slug: string;
    schemaName: string;
    status: string;
  };
  permissions: string[];
  rateLimitInfo?: RateLimitInfo;
}
