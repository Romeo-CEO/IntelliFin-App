import { registerAs } from '@nestjs/config';

export const airtelConfig = registerAs('airtel', () => ({
  clientId: process.env.AIRTEL_CLIENT_ID,
  clientSecret: process.env.AIRTEL_CLIENT_SECRET,
  baseUrl: process.env.AIRTEL_BASE_URL || 'https://openapiuat.airtel.africa',
  redirectUri: process.env.AIRTEL_REDIRECT_URI || 'http://localhost:3001/api/integrations/airtel/callback',
  scopes: process.env.AIRTEL_SCOPES || 'profile,transactions,balance',
  environment: process.env.AIRTEL_ENVIRONMENT || 'sandbox', // sandbox or production
  timeout: parseInt(process.env.AIRTEL_TIMEOUT || '30000', 10),
  retryAttempts: parseInt(process.env.AIRTEL_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.AIRTEL_RETRY_DELAY || '1000', 10),
  webhookSecret: process.env.AIRTEL_WEBHOOK_SECRET,
  webhookUrl: process.env.AIRTEL_WEBHOOK_URL,
}));
