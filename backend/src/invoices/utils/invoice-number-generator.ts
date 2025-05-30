import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface InvoiceNumberFormat {
  prefix?: string;
  includeYear?: boolean;
  includeMonth?: boolean;
  includeDay?: boolean;
  sequenceLength?: number;
  separator?: string;
  customFormat?: string;
}

export interface GeneratedInvoiceNumber {
  invoiceNumber: string;
  sequenceNumber: number;
  format: string;
}

@Injectable()
export class InvoiceNumberGenerator {
  private readonly logger = new Logger(InvoiceNumberGenerator.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate next invoice number for organization
   */
  async generateInvoiceNumber(
    organizationId: string,
    format?: InvoiceNumberFormat
  ): Promise<GeneratedInvoiceNumber> {
    try {
      // Get organization settings or use defaults
      const settings = await this.getOrganizationSettings(organizationId);
      const finalFormat = {
        ...this.getDefaultFormat(),
        ...settings,
        ...format,
      };

      // Get next sequence number
      const sequenceNumber = await this.getNextSequenceNumber(organizationId);

      // Generate invoice number
      const invoiceNumber = this.formatInvoiceNumber(
        sequenceNumber,
        finalFormat
      );

      // Validate uniqueness
      await this.validateUniqueness(organizationId, invoiceNumber);

      return {
        invoiceNumber,
        sequenceNumber,
        format: this.formatToString(finalFormat),
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate invoice number: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get default invoice number format
   */
  private getDefaultFormat(): InvoiceNumberFormat {
    return {
      prefix: 'INV',
      includeYear: true,
      includeMonth: false,
      includeDay: false,
      sequenceLength: 5,
      separator: '-',
    };
  }

  /**
   * Get organization-specific settings (placeholder for future implementation)
   */
  private async getOrganizationSettings(
    organizationId: string
  ): Promise<Partial<InvoiceNumberFormat>> {
    // TODO: Implement organization settings table
    // For now, return empty object to use defaults
    return {};
  }

  /**
   * Get next sequence number for the organization
   */
  private async getNextSequenceNumber(organizationId: string): Promise<number> {
    try {
      // Get the current year for yearly sequence reset
      const currentYear = new Date().getFullYear();

      // Find the highest invoice number for this organization in the current year
      const latestInvoice = await this.prisma.invoice.findFirst({
        where: {
          organizationId,
          issueDate: {
            gte: new Date(`${currentYear}-01-01`),
            lt: new Date(`${currentYear + 1}-01-01`),
          },
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          invoiceNumber: true,
        },
      });

      if (!latestInvoice) {
        return 1; // First invoice of the year
      }

      // Extract sequence number from the latest invoice number
      const sequenceNumber = this.extractSequenceNumber(
        latestInvoice.invoiceNumber
      );
      return sequenceNumber + 1;
    } catch (error) {
      this.logger.error(
        `Failed to get next sequence number: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Extract sequence number from invoice number
   */
  private extractSequenceNumber(invoiceNumber: string): number {
    // Try to extract the last numeric part of the invoice number
    const matches = invoiceNumber.match(/(\d+)$/);
    if (matches) {
      return parseInt(matches[1], 10);
    }

    // If no numeric part found, try to extract from common patterns
    const patterns = [
      /INV-\d{4}-(\d+)/, // INV-2024-00001
      /INV-(\d+)/, // INV-00001
      /(\d+)$/, // Any number at the end
    ];

    for (const pattern of patterns) {
      const match = invoiceNumber.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // Default to 0 if no sequence found
    return 0;
  }

  /**
   * Format invoice number based on format settings
   */
  private formatInvoiceNumber(
    sequenceNumber: number,
    format: InvoiceNumberFormat
  ): string {
    if (format.customFormat) {
      return this.applyCustomFormat(sequenceNumber, format.customFormat);
    }

    const parts: string[] = [];
    const date = new Date();

    // Add prefix
    if (format.prefix) {
      parts.push(format.prefix);
    }

    // Add date components
    if (format.includeYear) {
      parts.push(date.getFullYear().toString());
    }

    if (format.includeMonth) {
      parts.push((date.getMonth() + 1).toString().padStart(2, '0'));
    }

    if (format.includeDay) {
      parts.push(date.getDate().toString().padStart(2, '0'));
    }

    // Add sequence number
    const paddedSequence = sequenceNumber
      .toString()
      .padStart(format.sequenceLength || 5, '0');
    parts.push(paddedSequence);

    // Join with separator
    return parts.join(format.separator || '-');
  }

  /**
   * Apply custom format string
   */
  private applyCustomFormat(
    sequenceNumber: number,
    customFormat: string
  ): string {
    const date = new Date();
    const replacements = {
      '{YYYY}': date.getFullYear().toString(),
      '{YY}': date.getFullYear().toString().slice(-2),
      '{MM}': (date.getMonth() + 1).toString().padStart(2, '0'),
      '{DD}': date.getDate().toString().padStart(2, '0'),
      '{SEQUENCE}': sequenceNumber.toString().padStart(5, '0'),
      '{SEQUENCE:3}': sequenceNumber.toString().padStart(3, '0'),
      '{SEQUENCE:4}': sequenceNumber.toString().padStart(4, '0'),
      '{SEQUENCE:5}': sequenceNumber.toString().padStart(5, '0'),
      '{SEQUENCE:6}': sequenceNumber.toString().padStart(6, '0'),
    };

    let result = customFormat;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
        value
      );
    }

    return result;
  }

  /**
   * Validate that the generated invoice number is unique
   */
  private async validateUniqueness(
    organizationId: string,
    invoiceNumber: string
  ): Promise<void> {
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        organizationId,
        invoiceNumber,
        deletedAt: null,
      },
    });

    if (existingInvoice) {
      throw new Error(`Invoice number ${invoiceNumber} already exists`);
    }
  }

  /**
   * Convert format object to string representation
   */
  private formatToString(format: InvoiceNumberFormat): string {
    if (format.customFormat) {
      return format.customFormat;
    }

    const parts: string[] = [];

    if (format.prefix) {
      parts.push(format.prefix);
    }

    if (format.includeYear) {
      parts.push('{YYYY}');
    }

    if (format.includeMonth) {
      parts.push('{MM}');
    }

    if (format.includeDay) {
      parts.push('{DD}');
    }

    parts.push(`{SEQUENCE:${format.sequenceLength || 5}}`);

    return parts.join(format.separator || '-');
  }

  /**
   * Preview invoice number format
   */
  async previewInvoiceNumber(
    organizationId: string,
    format?: InvoiceNumberFormat
  ): Promise<{
    preview: string;
    nextNumber: string;
    format: string;
  }> {
    try {
      // Get organization settings or use defaults
      const settings = await this.getOrganizationSettings(organizationId);
      const finalFormat = {
        ...this.getDefaultFormat(),
        ...settings,
        ...format,
      };

      // Get next sequence number
      const sequenceNumber = await this.getNextSequenceNumber(organizationId);

      // Generate preview with current sequence
      const preview = this.formatInvoiceNumber(
        sequenceNumber - 1 || 1,
        finalFormat
      );
      const nextNumber = this.formatInvoiceNumber(sequenceNumber, finalFormat);

      return {
        preview,
        nextNumber,
        format: this.formatToString(finalFormat),
      };
    } catch (error) {
      this.logger.error(
        `Failed to preview invoice number: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Validate invoice number format
   */
  validateInvoiceNumberFormat(invoiceNumber: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check length
    if (invoiceNumber.length < 3) {
      errors.push('Invoice number must be at least 3 characters long');
    }

    if (invoiceNumber.length > 50) {
      errors.push('Invoice number cannot exceed 50 characters');
    }

    // Check for invalid characters
    if (!/^[A-Za-z0-9\-_\/]+$/.test(invoiceNumber)) {
      errors.push(
        'Invoice number can only contain letters, numbers, hyphens, underscores, and forward slashes'
      );
    }

    // Check for consecutive separators
    if (/[-_\/]{2,}/.test(invoiceNumber)) {
      errors.push('Invoice number cannot contain consecutive separators');
    }

    // Check start and end characters
    if (/^[-_\/]|[-_\/]$/.test(invoiceNumber)) {
      errors.push('Invoice number cannot start or end with a separator');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get common invoice number format templates
   */
  getFormatTemplates(): Array<{
    name: string;
    description: string;
    format: InvoiceNumberFormat;
    example: string;
  }> {
    return [
      {
        name: 'Standard',
        description: 'INV-YYYY-NNNNN (e.g., INV-2024-00001)',
        format: {
          prefix: 'INV',
          includeYear: true,
          sequenceLength: 5,
          separator: '-',
        },
        example: 'INV-2024-00001',
      },
      {
        name: 'Simple',
        description: 'INV-NNNNN (e.g., INV-00001)',
        format: {
          prefix: 'INV',
          sequenceLength: 5,
          separator: '-',
        },
        example: 'INV-00001',
      },
      {
        name: 'Monthly',
        description: 'INV-YYYY-MM-NNNNN (e.g., INV-2024-01-00001)',
        format: {
          prefix: 'INV',
          includeYear: true,
          includeMonth: true,
          sequenceLength: 5,
          separator: '-',
        },
        example: 'INV-2024-01-00001',
      },
      {
        name: 'Daily',
        description: 'INV-YYYYMMDD-NNNNN (e.g., INV-20240115-00001)',
        format: {
          prefix: 'INV',
          includeYear: true,
          includeMonth: true,
          includeDay: true,
          sequenceLength: 5,
          separator: '-',
        },
        example: 'INV-20240115-00001',
      },
      {
        name: 'Custom',
        description: 'Custom format using placeholders',
        format: {
          customFormat: 'INVOICE/{YYYY}/{SEQUENCE:6}',
        },
        example: 'INVOICE/2024/000001',
      },
    ];
  }
}
