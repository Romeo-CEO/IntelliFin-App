import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AirtelMoneyApiClient } from './airtel-money-api.client';
import { AirtelMoneyTokenRepository } from './airtel-money-token.repository';
import {
  ConnectAccountDto,
  ConnectAccountResponseDto,
  OAuthStateDto,
  TokenExchangeDto,
} from './dto/airtel-money-api.dto';
import { MobileMoneyProvider } from '@prisma/client';

@Injectable()
export class AirtelMoneyOAuthService {
  private readonly logger = new Logger(AirtelMoneyOAuthService.name);
  private readonly stateCache = new Map<string, OAuthStateDto>();
  private readonly stateExpirationMs = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly apiClient: AirtelMoneyApiClient,
    private readonly tokenRepository: AirtelMoneyTokenRepository
  ) {
    // Clean up expired state tokens every 5 minutes
    setInterval(() => this.cleanupExpiredStates(), 5 * 60 * 1000);
  }

  /**
   * Initiate OAuth flow for connecting Airtel Money account
   */
  async initiateConnection(
    organizationId: string,
    userId: string,
    connectDto: ConnectAccountDto
  ): Promise<ConnectAccountResponseDto> {
    try {
      // Validate phone number format
      const phoneNumber = this.normalizePhoneNumber(connectDto.phoneNumber);

      // Check if account is already connected
      const existingAccount = await this.findExistingAccount(
        organizationId,
        phoneNumber
      );
      if (existingAccount && existingAccount.isLinked) {
        throw new BadRequestException(
          'This Airtel Money account is already connected'
        );
      }

      // Generate secure state token
      const state = this.generateStateToken();
      const stateData: OAuthStateDto = {
        organizationId,
        userId,
        phoneNumber,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex'),
      };

      // Store state temporarily
      this.stateCache.set(state, stateData);

      // Generate OAuth authorization URL
      const authUrl = this.apiClient.generateAuthUrl(state);

      this.logger.debug(
        `Initiated OAuth flow for organization ${organizationId}, phone: ${phoneNumber}`
      );

      return {
        authUrl,
        state,
      };
    } catch (error) {
      this.logger.error('Failed to initiate OAuth connection:', error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback and complete account linking
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
      // Validate and retrieve state data
      const stateData = this.validateState(state);
      if (!stateData) {
        throw new BadRequestException('Invalid or expired state parameter');
      }

      // Exchange authorization code for tokens
      const tokenResponse = await this.apiClient.exchangeCodeForToken(code);

      // Get account profile from Airtel
      const accountProfile = await this.apiClient.getAccountProfile(
        tokenResponse.access_token
      );

      // Validate phone number matches
      const normalizedPhone = this.normalizePhoneNumber(accountProfile.msisdn);
      if (normalizedPhone !== stateData.phoneNumber) {
        throw new BadRequestException(
          'Phone number mismatch between request and Airtel account'
        );
      }

      // Get account balance
      const balanceInfo = await this.apiClient.getAccountBalance(
        tokenResponse.access_token
      );

      // Create or update mobile money account
      const accountId = await this.createOrUpdateAccount(
        stateData,
        accountProfile,
        balanceInfo,
        tokenResponse
      );

      // Clean up state
      this.stateCache.delete(state);

      this.logger.debug(
        `Successfully linked Airtel Money account: ${accountId}`
      );

      return {
        success: true,
        accountId,
      };
    } catch (error) {
      this.logger.error('Failed to handle OAuth callback:', error);

      // Clean up state on error
      this.stateCache.delete(state);

      return {
        success: false,
        error: error.message || 'Failed to link account',
      };
    }
  }

  /**
   * Refresh access token for an account
   */
  async refreshAccessToken(accountId: string): Promise<boolean> {
    try {
      const tokens = await this.tokenRepository.getTokens(accountId);
      if (!tokens || !tokens.refreshToken) {
        this.logger.warn(
          `No refresh token available for account: ${accountId}`
        );
        return false;
      }

      // Exchange refresh token for new access token
      const tokenResponse = await this.apiClient.refreshToken(
        tokens.refreshToken
      );

      // Calculate new expiration time
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      // Update stored tokens
      await this.tokenRepository.updateTokens(accountId, {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || tokens.refreshToken,
        expiresAt,
      });

      this.logger.debug(
        `Successfully refreshed tokens for account: ${accountId}`
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to refresh tokens for account ${accountId}:`,
        error
      );

      // Mark account as unlinked if refresh fails
      await this.tokenRepository.removeTokens(accountId);
      await this.prisma.mobileMoneyAccount.update({
        where: { id: accountId },
        data: { isLinked: false },
      });

      return false;
    }
  }

  /**
   * Disconnect Airtel Money account
   */
  async disconnectAccount(accountId: string, userId: string): Promise<void> {
    try {
      // Verify account belongs to user's organization
      const account = await this.prisma.mobileMoneyAccount.findFirst({
        where: {
          id: accountId,
          organization: {
            users: {
              some: { id: userId },
            },
          },
        },
      });

      if (!account) {
        throw new BadRequestException('Account not found or access denied');
      }

      // Remove tokens and mark as unlinked
      await this.tokenRepository.removeTokens(accountId);

      this.logger.debug(`Disconnected Airtel Money account: ${accountId}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Get OAuth connection status for an organization
   */
  async getConnectionStatus(organizationId: string): Promise<{
    hasLinkedAccounts: boolean;
    accountCount: number;
    accounts: Array<{
      id: string;
      accountNumber: string;
      accountName: string;
      isLinked: boolean;
      lastSyncAt: Date | null;
      currentBalance: number | null;
    }>;
  }> {
    try {
      const accounts = await this.prisma.mobileMoneyAccount.findMany({
        where: {
          organizationId,
          provider: MobileMoneyProvider.AIRTEL_MONEY,
        },
        select: {
          id: true,
          accountNumber: true,
          accountName: true,
          isLinked: true,
          lastSyncAt: true,
          currentBalance: true,
        },
      });

      return {
        hasLinkedAccounts: accounts.some(account => account.isLinked),
        accountCount: accounts.length,
        accounts: accounts.map(account => ({
          ...account,
          currentBalance: account.currentBalance
            ? parseFloat(account.currentBalance.toString())
            : null,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get connection status for organization ${organizationId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Generate secure state token
   */
  private generateStateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate state token and return associated data
   */
  private validateState(state: string): OAuthStateDto | null {
    const stateData = this.stateCache.get(state);
    if (!stateData) {
      return null;
    }

    // Check if state has expired
    const now = Date.now();
    if (now - stateData.timestamp > this.stateExpirationMs) {
      this.stateCache.delete(state);
      return null;
    }

    return stateData;
  }

  /**
   * Clean up expired state tokens
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const expiredStates: string[] = [];

    for (const [state, data] of this.stateCache.entries()) {
      if (now - data.timestamp > this.stateExpirationMs) {
        expiredStates.push(state);
      }
    }

    expiredStates.forEach(state => this.stateCache.delete(state));

    if (expiredStates.length > 0) {
      this.logger.debug(
        `Cleaned up ${expiredStates.length} expired state tokens`
      );
    }
  }

  /**
   * Normalize phone number to standard format
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Handle Zambian phone numbers
    if (digits.startsWith('260')) {
      return `+${digits}`;
    } else if (digits.startsWith('0')) {
      return `+260${digits.substring(1)}`;
    } else if (digits.length === 9) {
      return `+260${digits}`;
    }

    return `+${digits}`;
  }

  /**
   * Find existing account by organization and phone number
   */
  private async findExistingAccount(
    organizationId: string,
    phoneNumber: string
  ) {
    return await this.prisma.mobileMoneyAccount.findFirst({
      where: {
        organizationId,
        provider: MobileMoneyProvider.AIRTEL_MONEY,
        accountNumber: phoneNumber,
      },
    });
  }

  /**
   * Create or update mobile money account
   */
  private async createOrUpdateAccount(
    stateData: OAuthStateDto,
    accountProfile: any,
    balanceInfo: any,
    tokenResponse: any
  ): Promise<string> {
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // Check if account already exists
    const existingAccount = await this.findExistingAccount(
      stateData.organizationId,
      stateData.phoneNumber
    );

    if (existingAccount) {
      // Update existing account
      await this.prisma.mobileMoneyAccount.update({
        where: { id: existingAccount.id },
        data: {
          accountName:
            `${accountProfile.first_name || ''} ${accountProfile.last_name || ''}`.trim(),
          isLinked: true,
          currentBalance: parseFloat(balanceInfo.balance),
          balanceUpdatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Store encrypted tokens
      await this.tokenRepository.storeTokens(existingAccount.id, {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
      });

      return existingAccount.id;
    } else {
      // Create new account
      const newAccount = await this.prisma.mobileMoneyAccount.create({
        data: {
          organizationId: stateData.organizationId,
          provider: MobileMoneyProvider.AIRTEL_MONEY,
          accountNumber: stateData.phoneNumber,
          accountName:
            `${accountProfile.first_name || ''} ${accountProfile.last_name || ''}`.trim(),
          isLinked: true,
          currentBalance: parseFloat(balanceInfo.balance),
          currency: 'ZMW',
          balanceUpdatedAt: new Date(),
        },
      });

      // Store encrypted tokens
      await this.tokenRepository.storeTokens(newAccount.id, {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
      });

      return newAccount.id;
    }
  }
}
