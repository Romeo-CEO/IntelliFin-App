import { registerAs } from '@nestjs/config';

export const azureConfig = registerAs('azure', () => ({
  keyVault: {
    url: process.env.AZURE_KEY_VAULT_URL,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    tenantId: process.env.AZURE_TENANT_ID,
  },
  storage: {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'intellifin-files',
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
  },
  serviceBus: {
    connectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING,
    queueName: process.env.AZURE_SERVICE_BUS_QUEUE_NAME || 'intellifin-queue',
  },
  applicationInsights: {
    instrumentationKey: process.env.AZURE_APPLICATION_INSIGHTS_INSTRUMENTATION_KEY,
    connectionString: process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING,
  },
}));
