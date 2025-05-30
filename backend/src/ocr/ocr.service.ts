import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OcrResult {
  text: string;
  confidence: number;
  extractedData: {
    vendor?: string;
    date?: string;
    total?: number;
    subtotal?: number;
    tax?: number;
    vatAmount?: number;
    currency?: string;
    items?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      amount: number;
    }>;
    receiptNumber?: string;
    paymentMethod?: string;
  };
}

export interface OcrProcessingOptions {
  language?: string;
  extractStructuredData?: boolean;
  enhanceImage?: boolean;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Process receipt image/PDF with OCR
   */
  async processReceipt(
    fileBuffer: Buffer,
    contentType: string,
    options: OcrProcessingOptions = {}
  ): Promise<OcrResult> {
    try {
      this.logger.log(`Starting OCR processing for file type: ${contentType}`);

      // For MVP, we'll implement a basic OCR simulation
      // In production, this would integrate with Azure Computer Vision or similar service
      const result = await this.performOcr(fileBuffer, contentType, options);

      this.logger.log(
        `OCR processing completed with confidence: ${result.confidence}`
      );
      return result;
    } catch (error) {
      this.logger.error(`OCR processing failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Extract structured data from OCR text
   */
  async extractStructuredData(
    ocrText: string
  ): Promise<OcrResult['extractedData']> {
    try {
      const extractedData: OcrResult['extractedData'] = {};

      // Extract vendor name (usually at the top of the receipt)
      const vendorMatch = this.extractVendor(ocrText);
      if (vendorMatch) {
        extractedData.vendor = vendorMatch;
      }

      // Extract date
      const dateMatch = this.extractDate(ocrText);
      if (dateMatch) {
        extractedData.date = dateMatch;
      }

      // Extract total amount
      const totalMatch = this.extractTotal(ocrText);
      if (totalMatch) {
        extractedData.total = totalMatch;
      }

      // Extract VAT/Tax amount
      const vatMatch = this.extractVat(ocrText);
      if (vatMatch) {
        extractedData.vatAmount = vatMatch;
      }

      // Extract receipt number
      const receiptNumberMatch = this.extractReceiptNumber(ocrText);
      if (receiptNumberMatch) {
        extractedData.receiptNumber = receiptNumberMatch;
      }

      // Extract line items
      const items = this.extractLineItems(ocrText);
      if (items.length > 0) {
        extractedData.items = items;
      }

      // Set default currency for Zambia
      extractedData.currency = 'ZMW';

      return extractedData;
    } catch (error) {
      this.logger.error(
        `Failed to extract structured data: ${error.message}`,
        error
      );
      return {};
    }
  }

  /**
   * Validate OCR results
   */
  validateOcrResult(result: OcrResult): boolean {
    try {
      // Basic validation checks
      if (!result.text || result.text.trim().length === 0) {
        return false;
      }

      if (result.confidence < 0.5) {
        return false;
      }

      // Check if we extracted at least some meaningful data
      const hasVendor =
        result.extractedData.vendor && result.extractedData.vendor.length > 0;
      const hasTotal =
        result.extractedData.total && result.extractedData.total > 0;
      const hasDate =
        result.extractedData.date && result.extractedData.date.length > 0;

      return hasVendor || hasTotal || hasDate;
    } catch (error) {
      this.logger.error(`OCR validation failed: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Perform actual OCR processing (placeholder implementation)
   */
  private async performOcr(
    fileBuffer: Buffer,
    contentType: string,
    options: OcrProcessingOptions
  ): Promise<OcrResult> {
    // This is a placeholder implementation for MVP
    // In production, integrate with Azure Computer Vision, Google Cloud Vision, or Tesseract.js

    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock OCR result based on file type
    const mockText = this.generateMockOcrText(contentType);
    const extractedData = await this.extractStructuredData(mockText);

    return {
      text: mockText,
      confidence: 0.85,
      extractedData,
    };
  }

  /**
   * Generate mock OCR text for testing (placeholder)
   */
  private generateMockOcrText(contentType: string): string {
    // This is for testing purposes only
    const mockReceipts = [
      `SHOPRITE ZAMBIA
123 Cairo Road, Lusaka
Tel: +260 211 123456
VAT No: 1234567890

Date: ${new Date().toISOString().split('T')[0]}
Receipt No: SR${Math.floor(Math.random() * 100000)}

Bread - White Loaf        K15.00
Milk - 1L                 K12.50
Eggs - 12 pack            K25.00
Rice - 2kg                K35.00

Subtotal:                 K87.50
VAT (16%):               K14.00
TOTAL:                   K101.50

Payment Method: Cash
Thank you for shopping with us!`,

      `OFFICE SUPPLIES LTD
456 Independence Ave, Lusaka
Tel: +260 211 987654
VAT No: 9876543210

Date: ${new Date().toISOString().split('T')[0]}
Invoice No: OS${Math.floor(Math.random() * 100000)}

A4 Paper - 5 reams        K125.00
Printer Ink - Black       K85.00
Pens - Blue (10 pack)     K45.00
Stapler                   K35.00

Subtotal:                 K290.00
VAT (16%):               K46.40
TOTAL:                   K336.40

Payment Method: Mobile Money
Thank you for your business!`,
    ];

    return mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
  }

  /**
   * Extract vendor name from OCR text
   */
  private extractVendor(text: string): string | null {
    try {
      const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Usually the vendor name is in the first few lines
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i];

        // Skip lines that look like addresses or phone numbers
        if (
          line.includes('Tel:') ||
          line.includes('Phone:') ||
          line.includes('VAT No:')
        ) {
          continue;
        }

        // Skip lines with only numbers or special characters
        if (/^[\d\s\-\+\(\)]+$/.test(line)) {
          continue;
        }

        // If line has reasonable length and contains letters, it's likely the vendor
        if (line.length >= 3 && line.length <= 50 && /[a-zA-Z]/.test(line)) {
          return line;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract date from OCR text
   */
  private extractDate(text: string): string | null {
    try {
      // Common date patterns
      const datePatterns = [
        /Date:\s*(\d{4}-\d{2}-\d{2})/i,
        /Date:\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Date:\s*(\d{2}-\d{2}-\d{4})/i,
        /(\d{4}-\d{2}-\d{2})/,
        /(\d{2}\/\d{2}\/\d{4})/,
        /(\d{2}-\d{2}-\d{4})/,
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract total amount from OCR text
   */
  private extractTotal(text: string): number | null {
    try {
      // Common total patterns
      const totalPatterns = [
        /TOTAL:\s*K?(\d+\.?\d*)/i,
        /Total:\s*K?(\d+\.?\d*)/i,
        /GRAND TOTAL:\s*K?(\d+\.?\d*)/i,
        /Amount:\s*K?(\d+\.?\d*)/i,
      ];

      for (const pattern of totalPatterns) {
        const match = text.match(pattern);
        if (match) {
          return parseFloat(match[1]);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract VAT amount from OCR text
   */
  private extractVat(text: string): number | null {
    try {
      // Common VAT patterns
      const vatPatterns = [
        /VAT\s*\(16%\):\s*K?(\d+\.?\d*)/i,
        /VAT:\s*K?(\d+\.?\d*)/i,
        /Tax:\s*K?(\d+\.?\d*)/i,
      ];

      for (const pattern of vatPatterns) {
        const match = text.match(pattern);
        if (match) {
          return parseFloat(match[1]);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract receipt number from OCR text
   */
  private extractReceiptNumber(text: string): string | null {
    try {
      // Common receipt number patterns
      const receiptPatterns = [
        /Receipt No:\s*([A-Z0-9]+)/i,
        /Invoice No:\s*([A-Z0-9]+)/i,
        /Ref No:\s*([A-Z0-9]+)/i,
        /No:\s*([A-Z0-9]+)/i,
      ];

      for (const pattern of receiptPatterns) {
        const match = text.match(pattern);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract line items from OCR text
   */
  private extractLineItems(text: string): Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }> {
    try {
      const items: Array<{
        description: string;
        quantity?: number;
        unitPrice?: number;
        amount: number;
      }> = [];

      const lines = text.split('\n');

      for (const line of lines) {
        // Look for lines that have item description and price
        // Pattern: Description ... Price
        const itemMatch = line.match(/^(.+?)\s+K?(\d+\.?\d*)$/);

        if (itemMatch) {
          const description = itemMatch[1].trim();
          const amount = parseFloat(itemMatch[2]);

          // Skip lines that look like totals or headers
          if (
            description.toLowerCase().includes('total') ||
            description.toLowerCase().includes('subtotal') ||
            description.toLowerCase().includes('vat') ||
            description.toLowerCase().includes('tax')
          ) {
            continue;
          }

          if (description.length > 2 && amount > 0) {
            items.push({
              description,
              amount,
            });
          }
        }
      }

      return items;
    } catch (error) {
      return [];
    }
  }
}
