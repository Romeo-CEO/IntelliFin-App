import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../database/database.module';
import { AirtelMoneyApiClient } from './airtel-money-api.client';
import { AirtelMoneyOAuthService } from './airtel-money-oauth.service';
import { AirtelMoneyOAuthController } from './airtel-money-oauth.controller';
import { AirtelMoneyTokenRepository } from './airtel-money-token.repository';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AirtelMoneyOAuthController],
  providers: [
    AirtelMoneyApiClient,
    AirtelMoneyOAuthService,
    AirtelMoneyTokenRepository,
  ],
  exports: [
    AirtelMoneyApiClient,
    AirtelMoneyOAuthService,
    AirtelMoneyTokenRepository,
  ],
})
export class AirtelMoneyModule {}
