import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

import { AirtelMoneyApiClient } from '../../src/integrations/airtel-money/airtel-money-api.client';
import { AirtelMoneyOAuthService } from '../../src/integrations/airtel-money/airtel-money-oauth.service';
import { AirtelMoneyTokenRepository } from '../../src/integrations/airtel-money/airtel-money-token.repository';
import { PrismaService } from '../../src/database/prisma.service';
import {
  AirtelTokenResponseDto,
  AirtelAccountProfileDto,
  AirtelBalanceDto,
  AirtelTransactionsResponseDto,
  GetTransactionsDto,
} from '../../src/integrations/airtel-money/dto/airtel-money-api.dto';

describe('Airtel Money Integration', () => {
  let apiClient: AirtelMoneyApiClient;
  let oauthService: AirtelMoneyOAuthService;
  let tokenRepository: AirtelMoneyTokenRepository;
  let httpService: HttpService;
  let configService: ConfigService;
  let prismaService: PrismaService;

  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    baseUrl: 'https://openapiuat.airtel.africa',
    redirectUri: 'http://localhost:3001/api/integrations/airtel/callback',
    scopes: 'profile,transactions,balance',
    environment: 'sandbox',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  };

  const mockTokenResponse: AirtelTokenResponseDto = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'profile transactions balance',
  };

  const mockAccountProfile: AirtelAccountProfileDto = {
    msisdn: '+260971234567',
    first_name: 'John',
    last_name: 'Doe',
    status: 'ACTIVE' as any,
    grade: 'PREMIUM',
    kyc_status: 'VERIFIED' as any,
  };

  const mockBalance: AirtelBalanceDto = {
    msisdn: '+260971234567',
    balance: 1000.50,
    currency: 'ZMW',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirtelMoneyApiClient,
        AirtelMoneyOAuthService,
        AirtelMoneyTokenRepository,
        {
          provide: HttpService,
          useValue: {
            request: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const configMap = {
                'airtel.clientId': mockConfig.clientId,
                'airtel.clientSecret': mockConfig.clientSecret,
                'airtel.baseUrl': mockConfig.baseUrl,
                'airtel.redirectUri': mockConfig.redirectUri,
                'airtel.scopes': mockConfig.scopes,
                'airtel.environment': mockConfig.environment,
                'airtel.timeout': mockConfig.timeout,
                'airtel.retryAttempts': mockConfig.retryAttempts,
                'airtel.retryDelay': mockConfig.retryDelay,
                'ENCRYPTION_KEY': 'test-encryption-key-32-characters-long',
              };
              return configMap[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            mobileMoneyAccount: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    apiClient = module.get<AirtelMoneyApiClient>(AirtelMoneyApiClient);
    oauthService = module.get<AirtelMoneyOAuthService>(AirtelMoneyOAuthService);
    tokenRepository = module.get<AirtelMoneyTokenRepository>(AirtelMoneyTokenRepository);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('AirtelMoneyApiClient', () => {
    describe('generateAuthUrl', () => {
      it('should generate valid OAuth authorization URL', () => {
        const state = 'test-state-token';
        const authUrl = apiClient.generateAuthUrl(state);

        expect(authUrl).toContain(mockConfig.baseUrl);
        expect(authUrl).toContain('client_id=' + mockConfig.clientId);
        expect(authUrl).toContain('redirect_uri=' + encodeURIComponent(mockConfig.redirectUri));
        expect(authUrl).toContain('scope=' + encodeURIComponent(mockConfig.scopes));
        expect(authUrl).toContain('state=' + state);
        expect(authUrl).toContain('response_type=code');
      });
    });

    describe('exchangeCodeForToken', () => {
      it('should successfully exchange authorization code for token', async () => {
        const mockResponse: AxiosResponse = {
          data: mockTokenResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

        const result = await apiClient.exchangeCodeForToken('test-auth-code');

        expect(result).toEqual(mockTokenResponse);
        expect(httpService.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            url: `${mockConfig.baseUrl}/auth/oauth/token`,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }),
        );
      });

      it('should handle token exchange errors', async () => {
        const mockError = {
          response: {
            status: 400,
            data: { error: 'invalid_grant' },
          },
        };

        jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => mockError));

        await expect(apiClient.exchangeCodeForToken('invalid-code')).rejects.toThrow();
      });
    });

    describe('refreshToken', () => {
      it('should successfully refresh access token', async () => {
        const mockResponse: AxiosResponse = {
          data: mockTokenResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

        const result = await apiClient.refreshToken('test-refresh-token');

        expect(result).toEqual(mockTokenResponse);
      });
    });

    describe('getAccountProfile', () => {
      it('should successfully fetch account profile', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            status: { code: '200', message: 'Success' },
            data: mockAccountProfile,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

        const result = await apiClient.getAccountProfile('test-access-token');

        expect(result).toEqual(mockAccountProfile);
        expect(httpService.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: `${mockConfig.baseUrl}/standard/v1/users/profile`,
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-access-token',
              'X-Country': 'ZM',
              'X-Currency': 'ZMW',
            }),
          }),
        );
      });
    });

    describe('getAccountBalance', () => {
      it('should successfully fetch account balance', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            status: { code: '200', message: 'Success' },
            data: mockBalance,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

        const result = await apiClient.getAccountBalance('test-access-token');

        expect(result).toEqual(mockBalance);
      });
    });

    describe('getTransactions', () => {
      it('should successfully fetch transactions with pagination', async () => {
        const mockTransactions: AirtelTransactionsResponseDto = {
          transactions: [
            {
              transaction_id: 'TXN123',
              reference: 'REF123',
              transaction_date: '2023-12-01T10:30:00Z',
              amount: 500.00,
              currency: 'ZMW',
              transaction_type: 'PAYMENT' as any,
              status: 'COMPLETED' as any,
              description: 'Test payment',
              fees: 10.00,
            },
          ],
          pagination: {
            total: 1,
            limit: 50,
            offset: 0,
            has_more: false,
          },
        };

        const mockResponse: AxiosResponse = {
          data: {
            status: { code: '200', message: 'Success' },
            data: mockTransactions,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        jest.spyOn(httpService, 'request').mockReturnValue(of(mockResponse));

        const params: GetTransactionsDto = {
          limit: 50,
          offset: 0,
          startDate: '2023-01-01',
          endDate: '2023-12-31',
        };

        const result = await apiClient.getTransactions('test-access-token', params);

        expect(result).toEqual(mockTransactions);
        expect(result.transactions).toHaveLength(1);
        expect(result.pagination.total).toBe(1);
      });
    });

    describe('error handling', () => {
      it('should handle rate limiting errors', async () => {
        const mockError = {
          response: {
            status: 429,
            data: { error: 'rate_limit_exceeded' },
          },
        };

        jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => mockError));

        await expect(apiClient.getAccountProfile('test-token')).rejects.toThrow();
      });

      it('should handle unauthorized errors', async () => {
        const mockError = {
          response: {
            status: 401,
            data: { error: 'unauthorized' },
          },
        };

        jest.spyOn(httpService, 'request').mockReturnValue(throwError(() => mockError));

        await expect(apiClient.getAccountProfile('invalid-token')).rejects.toThrow();
      });

      it('should handle network errors with retry', async () => {
        const networkError = { code: 'ECONNRESET' };

        jest.spyOn(httpService, 'request')
          .mockReturnValueOnce(throwError(() => networkError))
          .mockReturnValueOnce(throwError(() => networkError))
          .mockReturnValueOnce(of({
            data: {
              status: { code: '200', message: 'Success' },
              data: mockAccountProfile,
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
          }));

        const result = await apiClient.getAccountProfile('test-token');

        expect(result).toEqual(mockAccountProfile);
        expect(httpService.request).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('AirtelMoneyTokenRepository', () => {
    describe('encryption/decryption', () => {
      it('should validate encryption functionality', async () => {
        const isValid = await tokenRepository.validateEncryption();
        expect(isValid).toBe(true);
      });
    });

    describe('token management', () => {
      it('should store and retrieve tokens', async () => {
        const accountId = 'test-account-id';
        const tokenData = {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: new Date(Date.now() + 3600000),
        };

        jest.spyOn(prismaService.mobileMoneyAccount, 'update').mockResolvedValue({} as any);
        jest.spyOn(prismaService.mobileMoneyAccount, 'findUnique').mockResolvedValue({
          id: accountId,
          accessToken: 'encrypted-access-token',
          refreshToken: 'encrypted-refresh-token',
          tokenExpiresAt: tokenData.expiresAt,
          isLinked: true,
        } as any);

        await tokenRepository.storeTokens(accountId, tokenData);

        expect(prismaService.mobileMoneyAccount.update).toHaveBeenCalledWith({
          where: { id: accountId },
          data: expect.objectContaining({
            isLinked: true,
            tokenExpiresAt: tokenData.expiresAt,
          }),
        });
      });
    });
  });

  describe('AirtelMoneyOAuthService', () => {
    describe('initiateConnection', () => {
      it('should initiate OAuth flow successfully', async () => {
        const organizationId = 'test-org-id';
        const userId = 'test-user-id';
        const connectDto = { phoneNumber: '+260971234567' };

        jest.spyOn(prismaService.mobileMoneyAccount, 'findFirst').mockResolvedValue(null);

        const result = await oauthService.initiateConnection(organizationId, userId, connectDto);

        expect(result).toHaveProperty('authUrl');
        expect(result).toHaveProperty('state');
        expect(result.authUrl).toContain(mockConfig.baseUrl);
      });

      it('should reject already connected accounts', async () => {
        const organizationId = 'test-org-id';
        const userId = 'test-user-id';
        const connectDto = { phoneNumber: '+260971234567' };

        jest.spyOn(prismaService.mobileMoneyAccount, 'findFirst').mockResolvedValue({
          id: 'existing-account',
          isLinked: true,
        } as any);

        await expect(
          oauthService.initiateConnection(organizationId, userId, connectDto)
        ).rejects.toThrow('already connected');
      });
    });
  });
});
