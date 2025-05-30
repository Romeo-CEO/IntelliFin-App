import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

import { AirtelMoneyOAuthService } from './airtel-money-oauth.service';
import {
  ConnectAccountDto,
  ConnectAccountResponseDto,
  TokenExchangeDto,
} from './dto/airtel-money-api.dto';

@ApiTags('Airtel Money Integration')
@Controller('integrations/airtel-money')
export class AirtelMoneyOAuthController {
  constructor(private readonly oauthService: AirtelMoneyOAuthService) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Initiate Airtel Money account connection',
    description:
      'Start the OAuth flow to connect an Airtel Money account to the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth authorization URL generated successfully',
    type: ConnectAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid phone number or account already connected',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - Rate limit exceeded',
  })
  async connectAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() connectDto: ConnectAccountDto
  ): Promise<ConnectAccountResponseDto> {
    return await this.oauthService.initiateConnection(
      user.organizationId,
      user.userId,
      connectDto
    );
  }

  @Get('callback')
  @ApiOperation({
    summary: 'Handle OAuth callback from Airtel Money',
    description: 'Process the authorization code and complete account linking',
  })
  @ApiQuery({
    name: 'code',
    description: 'Authorization code from Airtel Money OAuth',
    required: true,
  })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
    required: true,
  })
  @ApiQuery({
    name: 'error',
    description: 'Error code if authorization failed',
    required: false,
  })
  @ApiQuery({
    name: 'error_description',
    description: 'Error description if authorization failed',
    required: false,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend with success or error status',
  })
  async handleCallback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
    @Res() res?: Response
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      // Handle OAuth errors
      if (error) {
        const errorMessage = errorDescription || error;
        const redirectUrl = `${frontendUrl}/dashboard/integrations/airtel-money?error=${encodeURIComponent(errorMessage)}`;
        return res.redirect(redirectUrl);
      }

      // Validate required parameters
      if (!code || !state) {
        const redirectUrl = `${frontendUrl}/dashboard/integrations/airtel-money?error=${encodeURIComponent('Missing authorization code or state parameter')}`;
        return res.redirect(redirectUrl);
      }

      // Process the callback
      const result = await this.oauthService.handleCallback(code, state);

      if (result.success) {
        const redirectUrl = `${frontendUrl}/dashboard/integrations/airtel-money?success=true&accountId=${result.accountId}`;
        return res.redirect(redirectUrl);
      } else {
        const redirectUrl = `${frontendUrl}/dashboard/integrations/airtel-money?error=${encodeURIComponent(result.error || 'Failed to link account')}`;
        return res.redirect(redirectUrl);
      }
    } catch (error) {
      const redirectUrl = `${frontendUrl}/dashboard/integrations/airtel-money?error=${encodeURIComponent('Internal server error')}`;
      return res.redirect(redirectUrl);
    }
  }

  @Post('refresh/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Refresh access token for Airtel Money account',
    description: 'Manually refresh the access token for a connected account',
  })
  @ApiParam({
    name: 'accountId',
    description: 'UUID of the mobile money account',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid account ID or refresh failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async refreshToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId', ParseUUIDPipe) accountId: string
  ): Promise<{ success: boolean; message: string }> {
    const success = await this.oauthService.refreshAccessToken(accountId);

    return {
      success,
      message: success
        ? 'Token refreshed successfully'
        : 'Failed to refresh token - account may need to be reconnected',
    };
  }

  @Post('disconnect/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Disconnect Airtel Money account',
    description: 'Remove the connection to an Airtel Money account',
  })
  @ApiParam({
    name: 'accountId',
    description: 'UUID of the mobile money account',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Account disconnected successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid account ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found or access denied',
  })
  async disconnectAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId', ParseUUIDPipe) accountId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.oauthService.disconnectAccount(accountId, user.userId);

    return {
      success: true,
      message: 'Account disconnected successfully',
    };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Airtel Money connection status',
    description:
      'Retrieve the connection status and linked accounts for the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        hasLinkedAccounts: { type: 'boolean' },
        accountCount: { type: 'number' },
        accounts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              accountNumber: { type: 'string' },
              accountName: { type: 'string' },
              isLinked: { type: 'boolean' },
              lastSyncAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
              currentBalance: { type: 'number', nullable: true },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getConnectionStatus(@CurrentUser() user: AuthenticatedUser): Promise<{
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
    return await this.oauthService.getConnectionStatus(user.organizationId);
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check for Airtel Money integration',
    description:
      'Check the health status of the Airtel Money integration service',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        environment: { type: 'string' },
      },
    },
  })
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    version: string;
    environment: string;
  }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
