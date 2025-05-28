import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZraSubmissionStatus } from '@prisma/client';
import { InvoiceWithRelations } from '../invoice.repository';

export interface ZraInvoiceSubmission {
  invoiceId: string;
  submissionId: string;
  status: ZraSubmissionStatus;
  receiptNumber?: string;
  qrCode?: string;
  submissionDate: Date;
  errorMessage?: string;
  validationErrors?: string[];
}

export interface ZraInvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  supplier: {
    name: string;
    tin: string;
    address: string;
    phone?: string;
    email?: string;
  };
  customer: {
    name: string;
    tin?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    vatRate: number;
    vatAmount: number;
    discountAmount?: number;
  }>;
  totals: {
    subtotal: number;
    totalVat: number;
    totalDiscount: number;
    grandTotal: number;
  };
  paymentTerms?: string;
  notes?: string;
}

export interface ZraApiResponse {
  success: boolean;
  submissionId?: string;
  receiptNumber?: string;
  qrCode?: string;
  status: string;
  message?: string;
  errors?: string[];
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

@Injectable()
export class ZraInvoiceService {
  private readonly logger = new Logger(ZraInvoiceService.name);
  private readonly zraApiUrl: string;
  private readonly zraApiKey: string;
  private readonly zraTin: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.zraApiUrl = this.configService.get<string>('ZRA_API_URL') || 'https://api.zra.org.zm/smartinvoice';
    this.zraApiKey = this.configService.get<string>('ZRA_API_KEY') || '';
    this.zraTin = this.configService.get<string>('ZRA_TIN') || '';
    this.isEnabled = this.configService.get<boolean>('ZRA_INTEGRATION_ENABLED') || false;

    if (this.isEnabled && (!this.zraApiKey || !this.zraTin)) {
      this.logger.warn('ZRA integration is enabled but API key or TIN is missing');
    }
  }

  /**
   * Submit invoice to ZRA Smart Invoice system
   */
  async submitInvoice(invoice: InvoiceWithRelations, organizationTin: string): Promise<ZraInvoiceSubmission> {
    try {
      if (!this.isEnabled) {
        this.logger.debug('ZRA integration is disabled, skipping submission');
        return this.createMockSubmission(invoice.id, ZraSubmissionStatus.DISABLED);
      }

      // Validate invoice data
      const validationResult = this.validateInvoiceForZra(invoice);
      if (!validationResult.isValid) {
        return {
          invoiceId: invoice.id,
          submissionId: '',
          status: ZraSubmissionStatus.VALIDATION_FAILED,
          submissionDate: new Date(),
          errorMessage: 'Invoice validation failed',
          validationErrors: validationResult.errors,
        };
      }

      // Prepare invoice data for ZRA
      const zraInvoiceData = this.prepareZraInvoiceData(invoice, organizationTin);

      // Submit to ZRA API
      const response = await this.callZraApi('/submit-invoice', zraInvoiceData);

      // Process response
      return this.processZraResponse(invoice.id, response);
    } catch (error) {
      this.logger.error(`Failed to submit invoice ${invoice.id} to ZRA: ${error.message}`, error);
      return {
        invoiceId: invoice.id,
        submissionId: '',
        status: ZraSubmissionStatus.FAILED,
        submissionDate: new Date(),
        errorMessage: error.message,
      };
    }
  }

  /**
   * Check submission status with ZRA
   */
  async checkSubmissionStatus(submissionId: string): Promise<ZraInvoiceSubmission> {
    try {
      if (!this.isEnabled) {
        return this.createMockSubmission('', ZraSubmissionStatus.DISABLED);
      }

      const response = await this.callZraApi(`/check-status/${submissionId}`);
      return this.processZraResponse('', response);
    } catch (error) {
      this.logger.error(`Failed to check ZRA submission status: ${error.message}`, error);
      return {
        invoiceId: '',
        submissionId,
        status: ZraSubmissionStatus.FAILED,
        submissionDate: new Date(),
        errorMessage: error.message,
      };
    }
  }

  /**
   * Cancel invoice submission with ZRA
   */
  async cancelInvoice(submissionId: string, reason: string): Promise<ZraInvoiceSubmission> {
    try {
      if (!this.isEnabled) {
        return this.createMockSubmission('', ZraSubmissionStatus.DISABLED);
      }

      const response = await this.callZraApi(`/cancel-invoice/${submissionId}`, { reason });
      return this.processZraResponse('', response);
    } catch (error) {
      this.logger.error(`Failed to cancel ZRA invoice: ${error.message}`, error);
      return {
        invoiceId: '',
        submissionId,
        status: ZraSubmissionStatus.FAILED,
        submissionDate: new Date(),
        errorMessage: error.message,
      };
    }
  }

  /**
   * Validate invoice data for ZRA compliance
   */
  private validateInvoiceForZra(invoice: InvoiceWithRelations): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!invoice.invoiceNumber) {
      errors.push('Invoice number is required');
    }

    if (!invoice.customer) {
      errors.push('Customer information is required');
    }

    if (!invoice.items || invoice.items.length === 0) {
      errors.push('Invoice must have at least one item');
    }

    // Check customer information
    if (invoice.customer) {
      if (!invoice.customer.name) {
        errors.push('Customer name is required');
      }

      // ZRA TIN is required for business customers
      if (invoice.totalAmount > 1000 && !invoice.customer.zraTin) {
        errors.push('Customer ZRA TIN is required for invoices over ZMW 1,000');
      }
    }

    // Check invoice items
    if (invoice.items) {
      invoice.items.forEach((item, index) => {
        if (!item.description) {
          errors.push(`Item ${index + 1}: Description is required`);
        }

        if (item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }

        if (item.unitPrice < 0) {
          errors.push(`Item ${index + 1}: Unit price cannot be negative`);
        }

        if (item.vatRate < 0 || item.vatRate > 100) {
          errors.push(`Item ${index + 1}: VAT rate must be between 0 and 100`);
        }
      });
    }

    // Check amounts
    if (invoice.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    if (invoice.vatAmount < 0) {
      errors.push('VAT amount cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Prepare invoice data for ZRA submission
   */
  private prepareZraInvoiceData(invoice: InvoiceWithRelations, organizationTin: string): ZraInvoiceData {
    return {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      currency: invoice.currency,
      supplier: {
        name: 'Organization Name', // TODO: Get from organization settings
        tin: organizationTin,
        address: 'Organization Address', // TODO: Get from organization settings
        phone: 'Organization Phone', // TODO: Get from organization settings
        email: 'Organization Email', // TODO: Get from organization settings
      },
      customer: {
        name: invoice.customer.name,
        tin: invoice.customer.zraTin,
        address: invoice.customer.address,
        phone: invoice.customer.phone,
        email: invoice.customer.email,
      },
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        vatRate: item.vatRate,
        vatAmount: item.vatAmount,
        discountAmount: item.discountAmount,
      })),
      totals: {
        subtotal: invoice.subtotal,
        totalVat: invoice.vatAmount,
        totalDiscount: invoice.discountAmount,
        grandTotal: invoice.totalAmount,
      },
      paymentTerms: invoice.terms,
      notes: invoice.notes,
    };
  }

  /**
   * Call ZRA API
   */
  private async callZraApi(endpoint: string, data?: any): Promise<ZraApiResponse> {
    const url = `${this.zraApiUrl}${endpoint}`;
    const options: RequestInit = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.zraApiKey}`,
        'X-ZRA-TIN': this.zraTin,
      },
      ...(data && { body: JSON.stringify(data) }),
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`ZRA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Process ZRA API response
   */
  private processZraResponse(invoiceId: string, response: ZraApiResponse): ZraInvoiceSubmission {
    let status: ZraSubmissionStatus;

    switch (response.status?.toLowerCase()) {
      case 'accepted':
      case 'approved':
        status = ZraSubmissionStatus.ACCEPTED;
        break;
      case 'pending':
      case 'processing':
        status = ZraSubmissionStatus.PENDING;
        break;
      case 'rejected':
        status = ZraSubmissionStatus.REJECTED;
        break;
      case 'cancelled':
        status = ZraSubmissionStatus.CANCELLED;
        break;
      default:
        status = response.success ? ZraSubmissionStatus.PENDING : ZraSubmissionStatus.FAILED;
    }

    return {
      invoiceId,
      submissionId: response.submissionId || '',
      status,
      receiptNumber: response.receiptNumber,
      qrCode: response.qrCode,
      submissionDate: new Date(),
      errorMessage: response.message,
      validationErrors: response.validationErrors?.map(e => `${e.field}: ${e.message}`),
    };
  }

  /**
   * Create mock submission for testing/disabled mode
   */
  private createMockSubmission(invoiceId: string, status: ZraSubmissionStatus): ZraInvoiceSubmission {
    return {
      invoiceId,
      submissionId: `MOCK-${Date.now()}`,
      status,
      receiptNumber: status === ZraSubmissionStatus.ACCEPTED ? `RCP-${Date.now()}` : undefined,
      qrCode: status === ZraSubmissionStatus.ACCEPTED ? 'mock-qr-code-data' : undefined,
      submissionDate: new Date(),
    };
  }

  /**
   * Get ZRA integration status
   */
  getIntegrationStatus(): {
    enabled: boolean;
    configured: boolean;
    apiUrl: string;
    hasApiKey: boolean;
    hasTin: boolean;
  } {
    return {
      enabled: this.isEnabled,
      configured: !!(this.zraApiKey && this.zraTin),
      apiUrl: this.zraApiUrl,
      hasApiKey: !!this.zraApiKey,
      hasTin: !!this.zraTin,
    };
  }

  /**
   * Test ZRA API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
  }> {
    if (!this.isEnabled) {
      return {
        success: false,
        message: 'ZRA integration is disabled',
      };
    }

    if (!this.zraApiKey || !this.zraTin) {
      return {
        success: false,
        message: 'ZRA API key or TIN is not configured',
      };
    }

    try {
      const startTime = Date.now();
      await this.callZraApi('/health');
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: 'ZRA API connection successful',
        responseTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `ZRA API connection failed: ${error.message}`,
      };
    }
  }
}
