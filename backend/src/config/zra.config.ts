import { registerAs } from '@nestjs/config';

export const zraConfig = registerAs('zra', () => ({
  apiUrl: process.env.ZRA_API_URL || 'https://api.zra.org.zm',
  clientId: process.env.ZRA_CLIENT_ID,
  clientSecret: process.env.ZRA_CLIENT_SECRET,
  environment: process.env.ZRA_ENVIRONMENT || 'sandbox', // sandbox or production
  timeout: parseInt(process.env.ZRA_TIMEOUT || '30000', 10),
  retryAttempts: parseInt(process.env.ZRA_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.ZRA_RETRY_DELAY || '2000', 10),
  smartInvoice: {
    enabled: process.env.ZRA_SMART_INVOICE_ENABLED === 'true',
    endpoint: process.env.ZRA_SMART_INVOICE_ENDPOINT || '/smartinvoice',
    version: process.env.ZRA_SMART_INVOICE_VERSION || 'v1',
  },
  taxRates: {
    vat: parseFloat(process.env.ZRA_VAT_RATE || '16'), // 16% VAT in Zambia
    withholdingTax: parseFloat(process.env.ZRA_WITHHOLDING_TAX_RATE || '15'), // 15% WHT
  },
}));
