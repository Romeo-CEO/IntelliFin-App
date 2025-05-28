import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { MobileMoneyAccount, MobileMoneyProvider } from '@prisma/client';

export interface EncryptedTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface TokenUpdateData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

@Injectable()
export class AirtelMoneyTokenRepository {
  private readonly logger = new Logger(AirtelMoneyTokenRepository.name);
  private readonly encryptionKey: string;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Get encryption key from environment or generate one
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 
      this.configService.get<string>('JWT_SECRET') ||
      crypto.randomBytes(32).toString('hex');

    if (this.encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
  }

  /**
   * Store encrypted tokens for a mobile money account
   */
  async storeTokens(
    accountId: string,
    tokenData: EncryptedTokenData,
  ): Promise<void> {
    try {
      const encryptedAccessToken = this.encrypt(tokenData.accessToken);
      const encryptedRefreshToken = this.encrypt(tokenData.refreshToken);

      await this.prisma.mobileMoneyAccount.update({
        where: { id: accountId },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokenData.expiresAt,
          isLinked: true,
          updatedAt: new Date(),
        },
      });

      this.logger.debug(`Stored encrypted tokens for account: ${accountId}`);
    } catch (error) {
      this.logger.error(`Failed to store tokens for account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt tokens for a mobile money account
   */
  async getTokens(accountId: string): Promise<EncryptedTokenData | null> {
    try {
      const account = await this.prisma.mobileMoneyAccount.findUnique({
        where: { id: accountId },
        select: {
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
          isLinked: true,
        },
      });

      if (!account || !account.isLinked || !account.accessToken) {
        return null;
      }

      const accessToken = this.decrypt(account.accessToken);
      const refreshToken = account.refreshToken ? this.decrypt(account.refreshToken) : null;

      return {
        accessToken,
        refreshToken,
        expiresAt: account.tokenExpiresAt,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve tokens for account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Update tokens for an existing account
   */
  async updateTokens(
    accountId: string,
    tokenData: TokenUpdateData,
  ): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (tokenData.accessToken) {
        updateData.accessToken = this.encrypt(tokenData.accessToken);
      }

      if (tokenData.refreshToken) {
        updateData.refreshToken = this.encrypt(tokenData.refreshToken);
      }

      if (tokenData.expiresAt) {
        updateData.tokenExpiresAt = tokenData.expiresAt;
      }

      await this.prisma.mobileMoneyAccount.update({
        where: { id: accountId },
        data: updateData,
      });

      this.logger.debug(`Updated tokens for account: ${accountId}`);
    } catch (error) {
      this.logger.error(`Failed to update tokens for account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Check if tokens are expired or about to expire
   */
  async areTokensExpired(accountId: string, bufferMinutes: number = 5): Promise<boolean> {
    try {
      const account = await this.prisma.mobileMoneyAccount.findUnique({
        where: { id: accountId },
        select: { tokenExpiresAt: true },
      });

      if (!account || !account.tokenExpiresAt) {
        return true;
      }

      const bufferTime = bufferMinutes * 60 * 1000; // Convert to milliseconds
      const expirationWithBuffer = new Date(account.tokenExpiresAt.getTime() - bufferTime);

      return new Date() >= expirationWithBuffer;
    } catch (error) {
      this.logger.error(`Failed to check token expiration for account ${accountId}:`, error);
      return true; // Assume expired on error
    }
  }

  /**
   * Remove tokens and mark account as unlinked
   */
  async removeTokens(accountId: string): Promise<void> {
    try {
      await this.prisma.mobileMoneyAccount.update({
        where: { id: accountId },
        data: {
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isLinked: false,
          updatedAt: new Date(),
        },
      });

      this.logger.debug(`Removed tokens for account: ${accountId}`);
    } catch (error) {
      this.logger.error(`Failed to remove tokens for account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Get all accounts with expired tokens
   */
  async getAccountsWithExpiredTokens(): Promise<MobileMoneyAccount[]> {
    try {
      const now = new Date();
      
      return await this.prisma.mobileMoneyAccount.findMany({
        where: {
          provider: MobileMoneyProvider.AIRTEL_MONEY,
          isLinked: true,
          tokenExpiresAt: {
            lte: now,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to get accounts with expired tokens:', error);
      throw error;
    }
  }

  /**
   * Get accounts that need token refresh (expiring soon)
   */
  async getAccountsNeedingRefresh(bufferMinutes: number = 10): Promise<MobileMoneyAccount[]> {
    try {
      const bufferTime = bufferMinutes * 60 * 1000;
      const expirationThreshold = new Date(Date.now() + bufferTime);
      
      return await this.prisma.mobileMoneyAccount.findMany({
        where: {
          provider: MobileMoneyProvider.AIRTEL_MONEY,
          isLinked: true,
          tokenExpiresAt: {
            lte: expirationThreshold,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to get accounts needing refresh:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipherGCM(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Failed to encrypt data:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedData: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      
      const decipher = crypto.createDecipherGCM(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt data:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Validate encryption/decryption functionality
   */
  async validateEncryption(): Promise<boolean> {
    try {
      const testData = 'test-token-data-' + Date.now();
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      return testData === decrypted;
    } catch (error) {
      this.logger.error('Encryption validation failed:', error);
      return false;
    }
  }

  /**
   * Get token statistics for monitoring
   */
  async getTokenStatistics(): Promise<{
    totalLinkedAccounts: number;
    expiredTokens: number;
    expiringTokens: number;
    healthyTokens: number;
  }> {
    try {
      const now = new Date();
      const bufferTime = 10 * 60 * 1000; // 10 minutes
      const expirationThreshold = new Date(now.getTime() + bufferTime);

      const [totalLinked, expired, expiring] = await Promise.all([
        this.prisma.mobileMoneyAccount.count({
          where: {
            provider: MobileMoneyProvider.AIRTEL_MONEY,
            isLinked: true,
          },
        }),
        this.prisma.mobileMoneyAccount.count({
          where: {
            provider: MobileMoneyProvider.AIRTEL_MONEY,
            isLinked: true,
            tokenExpiresAt: {
              lte: now,
            },
          },
        }),
        this.prisma.mobileMoneyAccount.count({
          where: {
            provider: MobileMoneyProvider.AIRTEL_MONEY,
            isLinked: true,
            tokenExpiresAt: {
              gt: now,
              lte: expirationThreshold,
            },
          },
        }),
      ]);

      return {
        totalLinkedAccounts: totalLinked,
        expiredTokens: expired,
        expiringTokens: expiring,
        healthyTokens: totalLinked - expired - expiring,
      };
    } catch (error) {
      this.logger.error('Failed to get token statistics:', error);
      throw error;
    }
  }
}
