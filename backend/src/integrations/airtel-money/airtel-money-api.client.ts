import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import * as crypto from 'crypto';

import {
  AirtelApiResponseDto,
  AirtelTransactionsResponseDto,
  AirtelAccountProfileDto,
  AirtelBalanceDto,
  AirtelTokenResponseDto,
  GetTransactionsDto,
  AirtelTransactionType,
} from './dto/airtel-money-api.dto';

export interface AirtelApiConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  redirectUri: string;
  scopes: string;
  environment: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface RetryConfig {
  attempts: number;
  delay: number;
  backoffMultiplier: number;
  maxDelay: number;
}

@Injectable()
export class AirtelMoneyApiClient {
  private readonly logger = new Logger(AirtelMoneyApiClient.name);
  private readonly config: AirtelApiConfig;
  private readonly retryConfig: RetryConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.config = {
      clientId: this.configService.get<string>('airtel.clientId'),
      clientSecret: this.configService.get<string>('airtel.clientSecret'),
      baseUrl: this.configService.get<string>('airtel.baseUrl'),
      redirectUri: this.configService.get<string>('airtel.redirectUri'),
      scopes: this.configService.get<string>('airtel.scopes'),
      environment: this.configService.get<string>('airtel.environment'),
      timeout: this.configService.get<number>('airtel.timeout'),
      retryAttempts: this.configService.get<number>('airtel.retryAttempts'),
      retryDelay: this.configService.get<number>('airtel.retryDelay'),
    };

    this.retryConfig = {
      attempts: this.config.retryAttempts || 3,
      delay: this.config.retryDelay || 1000,
      backoffMultiplier: 2,
      maxDelay: 30000,
    };

    this.validateConfig();
  }

  /**
   * Validate required configuration
   */
  private validateConfig(): void {
    const requiredFields = ['clientId', 'clientSecret', 'baseUrl', 'redirectUri'];
    const missingFields = requiredFields.filter(field => !this.config[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required Airtel Money configuration: ${missingFields.join(', ')}`
      );
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes,
      state,
      response_type: 'code',
    });

    const authUrl = `${this.config.baseUrl}/auth/oauth/authorize?${params.toString()}`;
    
    this.logger.debug(`Generated OAuth URL for state: ${state}`);
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<AirtelTokenResponseDto> {
    const url = `${this.config.baseUrl}/auth/oauth/token`;
    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
    });

    try {
      this.logger.debug('Exchanging authorization code for token');
      
      const response = await this.makeRequest<AirtelTokenResponseDto>('POST', url, {
        data: data.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.logger.debug('Successfully exchanged code for token');
      return response;
    } catch (error) {
      this.logger.error('Failed to exchange code for token', error);
      throw new HttpException(
        'Failed to exchange authorization code for token',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AirtelTokenResponseDto> {
    const url = `${this.config.baseUrl}/auth/oauth/token`;
    const data = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    try {
      this.logger.debug('Refreshing access token');
      
      const response = await this.makeRequest<AirtelTokenResponseDto>('POST', url, {
        data: data.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.logger.debug('Successfully refreshed token');
      return response;
    } catch (error) {
      this.logger.error('Failed to refresh token', error);
      throw new HttpException(
        'Failed to refresh access token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Get account profile information
   */
  async getAccountProfile(accessToken: string): Promise<AirtelAccountProfileDto> {
    const url = `${this.config.baseUrl}/standard/v1/users/profile`;

    try {
      this.logger.debug('Fetching account profile');
      
      const response = await this.makeAuthenticatedRequest<AirtelApiResponseDto<AirtelAccountProfileDto>>(
        'GET',
        url,
        accessToken,
      );

      if (response.status.code !== '200') {
        throw new Error(`API error: ${response.status.message}`);
      }

      this.logger.debug('Successfully fetched account profile');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch account profile', error);
      throw new HttpException(
        'Failed to fetch account profile',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accessToken: string): Promise<AirtelBalanceDto> {
    const url = `${this.config.baseUrl}/standard/v1/users/balance`;

    try {
      this.logger.debug('Fetching account balance');
      
      const response = await this.makeAuthenticatedRequest<AirtelApiResponseDto<AirtelBalanceDto>>(
        'GET',
        url,
        accessToken,
      );

      if (response.status.code !== '200') {
        throw new Error(`API error: ${response.status.message}`);
      }

      this.logger.debug('Successfully fetched account balance');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch account balance', error);
      throw new HttpException(
        'Failed to fetch account balance',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    accessToken: string,
    params: GetTransactionsDto,
  ): Promise<AirtelTransactionsResponseDto> {
    const url = `${this.config.baseUrl}/standard/v1/users/transactions`;
    const queryParams = new URLSearchParams();

    // Add query parameters
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    if (params.transactionType) queryParams.append('transaction_type', params.transactionType);

    const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

    try {
      this.logger.debug(`Fetching transactions with params: ${JSON.stringify(params)}`);
      
      const response = await this.makeAuthenticatedRequest<AirtelApiResponseDto<AirtelTransactionsResponseDto>>(
        'GET',
        fullUrl,
        accessToken,
      );

      if (response.status.code !== '200') {
        throw new Error(`API error: ${response.status.message}`);
      }

      this.logger.debug(`Successfully fetched ${response.data.transactions.length} transactions`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch transactions', error);
      throw new HttpException(
        'Failed to fetch transactions',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Make authenticated API request with standard headers
   */
  private async makeAuthenticatedRequest<T>(
    method: string,
    url: string,
    accessToken: string,
    options: any = {},
  ): Promise<T> {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'X-Country': 'ZM',
      'X-Currency': 'ZMW',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return this.makeRequest<T>(method, url, { ...options, headers });
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(
    method: string,
    url: string,
    options: any = {},
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryConfig.attempts; attempt++) {
      try {
        const response: AxiosResponse<T> = await firstValueFrom(
          this.httpService.request({
            method,
            url,
            timeout: this.config.timeout,
            ...options,
          }),
        );

        return response.data;
      } catch (error) {
        lastError = error;
        
        if (this.shouldRetry(error, attempt)) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn(
            `Request failed (attempt ${attempt}/${this.retryConfig.attempts}), retrying in ${delay}ms`,
            error.message,
          );
          await this.sleep(delay);
          continue;
        }

        // Don't retry, throw the error
        break;
      }
    }

    this.handleApiError(lastError);
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.retryConfig.attempts) {
      return false;
    }

    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on 5xx server errors and rate limiting
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.delay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle and transform API errors
   */
  private handleApiError(error: any): never {
    if (error.response) {
      const { status, data } = error.response;
      
      this.logger.error(`API error ${status}:`, data);

      // Handle specific error cases
      switch (status) {
        case 401:
          throw new HttpException('Unauthorized - Invalid or expired token', HttpStatus.UNAUTHORIZED);
        case 403:
          throw new HttpException('Forbidden - Insufficient permissions', HttpStatus.FORBIDDEN);
        case 404:
          throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
        case 429:
          throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
        default:
          throw new HttpException(
            data?.error?.error_description || 'External API error',
            status,
          );
      }
    }

    // Network or other errors
    this.logger.error('Network error:', error.message);
    throw new HttpException(
      'Failed to communicate with Airtel Money API',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
