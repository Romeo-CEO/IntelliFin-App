import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ProductRepository } from '../products/product.repository';
import { InventoryCacheService } from './inventory-cache.service';

export interface BarcodeValidationResult {
  isValid: boolean;
  format?: string;
  checksum?: boolean;
  errors?: string[];
}

export interface BarcodeGenerationOptions {
  format: 'EAN13' | 'UPC' | 'CODE128' | 'QR';
  data: string;
  includeChecksum?: boolean;
}

export interface ProductLookupResult {
  found: boolean;
  product?: any;
  suggestions?: any[];
}

/**
 * Barcode Service
 * Handles barcode generation, validation, and product lookup
 * Optimized for Zambian retail environments with mobile scanning
 */
@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  // Common barcode prefixes for different regions/manufacturers
  private readonly ZAMBIAN_PREFIXES = ['894', '895']; // Zambian GS1 prefixes
  private readonly COMMON_PREFIXES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly cacheService: InventoryCacheService,
  ) {}

  /**
   * Validate barcode format and checksum
   */
  async validateBarcode(barcode: string): Promise<BarcodeValidationResult> {
    try {
      const cleanBarcode = this.cleanBarcode(barcode);
      const errors: string[] = [];

      if (!cleanBarcode) {
        return {
          isValid: false,
          errors: ['Barcode cannot be empty'],
        };
      }

      // Detect barcode format
      const format = this.detectBarcodeFormat(cleanBarcode);
      if (!format) {
        errors.push('Unknown barcode format');
      }

      // Validate format-specific rules
      let checksumValid = false;
      switch (format) {
        case 'EAN13':
          checksumValid = this.validateEAN13(cleanBarcode);
          if (!checksumValid) {
            errors.push('Invalid EAN-13 checksum');
          }
          break;
        case 'UPC':
          checksumValid = this.validateUPC(cleanBarcode);
          if (!checksumValid) {
            errors.push('Invalid UPC checksum');
          }
          break;
        case 'CODE128':
          checksumValid = true; // CODE128 validation is more complex
          break;
        default:
          checksumValid = true; // For unknown formats, assume valid
      }

      return {
        isValid: errors.length === 0,
        format,
        checksum: checksumValid,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to validate barcode: ${error.message}`, error);
      return {
        isValid: false,
        errors: ['Validation failed'],
      };
    }
  }

  /**
   * Look up product by barcode
   */
  async lookupProductByBarcode(barcode: string, organizationId: string): Promise<ProductLookupResult> {
    try {
      const cleanBarcode = this.cleanBarcode(barcode);
      
      if (!cleanBarcode) {
        throw new BadRequestException('Invalid barcode format');
      }

      // Try exact match first
      const product = await this.productRepository.findByBarcode(cleanBarcode, organizationId);
      
      if (product) {
        return {
          found: true,
          product,
        };
      }

      // If no exact match, try to find similar barcodes
      const suggestions = await this.findSimilarBarcodes(cleanBarcode, organizationId);

      return {
        found: false,
        suggestions,
      };
    } catch (error) {
      this.logger.error(`Failed to lookup product by barcode: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate barcode for product
   */
  async generateBarcode(options: BarcodeGenerationOptions): Promise<string> {
    try {
      switch (options.format) {
        case 'EAN13':
          return this.generateEAN13(options.data);
        case 'UPC':
          return this.generateUPC(options.data);
        case 'CODE128':
          return this.generateCODE128(options.data);
        case 'QR':
          return this.generateQRCode(options.data);
        default:
          throw new BadRequestException(`Unsupported barcode format: ${options.format}`);
      }
    } catch (error) {
      this.logger.error(`Failed to generate barcode: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate unique barcode for organization
   */
  async generateUniqueBarcode(organizationId: string, format: 'EAN13' | 'UPC' = 'EAN13'): Promise<string> {
    try {
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts) {
        const barcode = await this.generateRandomBarcode(format, organizationId);
        
        // Check if barcode already exists
        const existing = await this.productRepository.findByBarcode(barcode, organizationId);
        if (!existing) {
          return barcode;
        }

        attempts++;
      }

      throw new Error('Failed to generate unique barcode after maximum attempts');
    } catch (error) {
      this.logger.error(`Failed to generate unique barcode: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Batch validate barcodes
   */
  async validateBarcodes(barcodes: string[]): Promise<BarcodeValidationResult[]> {
    try {
      const results = await Promise.all(
        barcodes.map(barcode => this.validateBarcode(barcode))
      );
      return results;
    } catch (error) {
      this.logger.error(`Failed to batch validate barcodes: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Clean barcode string
   */
  private cleanBarcode(barcode: string): string {
    if (!barcode) return '';
    
    // Remove spaces, hyphens, and other non-numeric characters for numeric barcodes
    return barcode.replace(/[\s\-]/g, '').trim();
  }

  /**
   * Detect barcode format
   */
  private detectBarcodeFormat(barcode: string): string | null {
    if (/^\d{13}$/.test(barcode)) {
      return 'EAN13';
    }
    if (/^\d{12}$/.test(barcode)) {
      return 'UPC';
    }
    if (/^[A-Za-z0-9\-\s]+$/.test(barcode) && barcode.length >= 6) {
      return 'CODE128';
    }
    return null;
  }

  /**
   * Validate EAN-13 checksum
   */
  private validateEAN13(barcode: string): boolean {
    if (barcode.length !== 13) return false;

    const digits = barcode.split('').map(Number);
    const checkDigit = digits.pop();
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    return calculatedCheckDigit === checkDigit;
  }

  /**
   * Validate UPC checksum
   */
  private validateUPC(barcode: string): boolean {
    if (barcode.length !== 12) return false;

    const digits = barcode.split('').map(Number);
    const checkDigit = digits.pop();
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }
    
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    return calculatedCheckDigit === checkDigit;
  }

  /**
   * Generate EAN-13 barcode
   */
  private generateEAN13(data: string): string {
    // Ensure data is 12 digits (without check digit)
    let baseCode = data.replace(/\D/g, '').substring(0, 12);
    
    // Pad with zeros if needed
    baseCode = baseCode.padStart(12, '0');
    
    // Calculate check digit
    const digits = baseCode.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return baseCode + checkDigit;
  }

  /**
   * Generate UPC barcode
   */
  private generateUPC(data: string): string {
    // Ensure data is 11 digits (without check digit)
    let baseCode = data.replace(/\D/g, '').substring(0, 11);
    
    // Pad with zeros if needed
    baseCode = baseCode.padStart(11, '0');
    
    // Calculate check digit
    const digits = baseCode.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return baseCode + checkDigit;
  }

  /**
   * Generate CODE128 barcode
   */
  private generateCODE128(data: string): string {
    // For simplicity, return the data as-is for CODE128
    // In a real implementation, you would encode according to CODE128 specification
    return data.toUpperCase();
  }

  /**
   * Generate QR code data
   */
  private generateQRCode(data: string): string {
    // Return the data for QR code generation
    // The actual QR code image would be generated on the frontend
    return data;
  }

  /**
   * Generate random barcode
   */
  private async generateRandomBarcode(format: 'EAN13' | 'UPC', organizationId: string): Promise<string> {
    const timestamp = Date.now().toString();
    const orgHash = this.hashString(organizationId).substring(0, 4);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    if (format === 'EAN13') {
      // Use Zambian prefix if available, otherwise use generic
      const prefix = this.ZAMBIAN_PREFIXES[0] || '200';
      const baseData = prefix + orgHash + random;
      return this.generateEAN13(baseData);
    } else {
      const baseData = orgHash + random + timestamp.substring(-4);
      return this.generateUPC(baseData);
    }
  }

  /**
   * Find similar barcodes
   */
  private async findSimilarBarcodes(barcode: string, organizationId: string): Promise<any[]> {
    try {
      // This is a simplified implementation
      // In a real system, you might use fuzzy matching or Levenshtein distance
      const products = await this.productRepository.findMany(
        {
          organizationId,
          isActive: true,
        },
        { name: 'asc' },
        0,
        10,
      );

      return products
        .filter(product => product.barcode && this.calculateSimilarity(barcode, product.barcode) > 0.7)
        .map(product => ({
          id: product.id,
          sku: product.sku,
          name: product.name,
          barcode: product.barcode,
          similarity: this.calculateSimilarity(barcode, product.barcode),
        }))
        .sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      this.logger.error(`Failed to find similar barcodes: ${error.message}`, error);
      return [];
    }
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Simple hash function for strings
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }
}
