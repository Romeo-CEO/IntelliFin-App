import { Injectable } from '@nestjs/common';
import { 
  registerDecorator, 
  ValidationOptions, 
  ValidatorConstraint, 
  ValidatorConstraintInterface,
  ValidationArguments 
} from 'class-validator';

/**
 * ZRA TIN (Tax Identification Number) Validator for Zambian customers
 * 
 * ZRA TIN Format Rules:
 * - 10 digits for individuals (TPIN)
 * - 10 digits for companies (TPIN)
 * - Format: XXXXXXXXXX (10 consecutive digits)
 * - No special characters or spaces
 * 
 * Note: This is a basic validation. In production, you might want to
 * integrate with ZRA's API for real-time validation.
 */

@ValidatorConstraint({ name: 'isValidZraTin', async: false })
@Injectable()
export class ZraTinValidator implements ValidatorConstraintInterface {
  
  validate(tin: string, args: ValidationArguments): boolean {
    if (!tin) {
      return true; // Allow empty TIN (optional field)
    }

    return this.isValidZraTin(tin);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'ZRA TIN must be a valid 10-digit Zambian Tax Identification Number';
  }

  /**
   * Validates ZRA TIN format
   */
  private isValidZraTin(tin: string): boolean {
    // Remove any whitespace
    const cleanTin = tin.replace(/\s/g, '');

    // Check if it's exactly 10 digits
    if (!/^\d{10}$/.test(cleanTin)) {
      return false;
    }

    // Additional validation rules can be added here
    // For example, check digit validation if ZRA provides such rules
    
    return this.validateCheckDigit(cleanTin);
  }

  /**
   * Validates check digit (placeholder implementation)
   * Note: This is a simplified implementation. 
   * Real ZRA TIN validation might have specific check digit algorithms.
   */
  private validateCheckDigit(tin: string): boolean {
    // For now, we'll implement a basic validation
    // In production, this should follow ZRA's actual check digit algorithm
    
    // Ensure no repeated digits (basic sanity check)
    if (/^(\d)\1{9}$/.test(tin)) {
      return false; // All same digits (like 0000000000) are invalid
    }

    // Ensure it's not a sequential number
    if (this.isSequential(tin)) {
      return false;
    }

    return true;
  }

  /**
   * Check if the TIN is a sequential number (like 1234567890)
   */
  private isSequential(tin: string): boolean {
    const digits = tin.split('').map(Number);
    
    // Check ascending sequence
    let isAscending = true;
    let isDescending = true;
    
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i - 1] + 1) {
        isAscending = false;
      }
      if (digits[i] !== digits[i - 1] - 1) {
        isDescending = false;
      }
    }
    
    return isAscending || isDescending;
  }

  /**
   * Format ZRA TIN for display (add spaces for readability)
   */
  static formatTin(tin: string): string {
    if (!tin) return '';
    
    const cleanTin = tin.replace(/\s/g, '');
    if (cleanTin.length === 10) {
      // Format as: XXXX XXX XXX
      return `${cleanTin.slice(0, 4)} ${cleanTin.slice(4, 7)} ${cleanTin.slice(7)}`;
    }
    
    return cleanTin;
  }

  /**
   * Clean ZRA TIN for storage (remove spaces and formatting)
   */
  static cleanTin(tin: string): string {
    if (!tin) return '';
    return tin.replace(/\s/g, '').toUpperCase();
  }

  /**
   * Validate TIN and return detailed result
   */
  static validateWithDetails(tin: string): {
    isValid: boolean;
    errors: string[];
    formatted?: string;
    cleaned?: string;
  } {
    const errors: string[] = [];
    
    if (!tin) {
      return { isValid: true, errors: [] }; // Optional field
    }

    const cleaned = this.cleanTin(tin);
    
    // Check length
    if (cleaned.length !== 10) {
      errors.push('TIN must be exactly 10 digits');
    }

    // Check if all digits
    if (!/^\d{10}$/.test(cleaned)) {
      errors.push('TIN must contain only digits');
    }

    // Check for repeated digits
    if (/^(\d)\1{9}$/.test(cleaned)) {
      errors.push('TIN cannot be all the same digit');
    }

    // Check for sequential numbers
    const validator = new ZraTinValidator();
    if (validator.isSequential(cleaned)) {
      errors.push('TIN cannot be a sequential number');
    }

    const isValid = errors.length === 0;
    
    return {
      isValid,
      errors,
      formatted: isValid ? this.formatTin(cleaned) : undefined,
      cleaned: isValid ? cleaned : undefined,
    };
  }
}

/**
 * Custom decorator for ZRA TIN validation
 */
export function IsValidZraTin(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ZraTinValidator,
    });
  };
}

/**
 * Utility functions for ZRA TIN handling
 */
export class ZraTinUtils {
  /**
   * Generate a sample valid TIN for testing purposes
   * Note: This generates a format-valid TIN, not a real one
   */
  static generateSampleTin(): string {
    // Generate a random 10-digit number that passes basic validation
    let tin = '';
    for (let i = 0; i < 10; i++) {
      // Avoid creating sequential or repeated patterns
      const digit = Math.floor(Math.random() * 10);
      tin += digit.toString();
    }
    
    // Ensure it's not all the same digit or sequential
    if (/^(\d)\1{9}$/.test(tin) || new ZraTinValidator().isSequential(tin)) {
      return this.generateSampleTin(); // Regenerate if invalid pattern
    }
    
    return tin;
  }

  /**
   * Mask TIN for display in logs or UI (security)
   */
  static maskTin(tin: string): string {
    if (!tin || tin.length < 4) return '****';
    
    const cleaned = ZraTinValidator.cleanTin(tin);
    return `${cleaned.slice(0, 2)}****${cleaned.slice(-2)}`;
  }

  /**
   * Check if TIN belongs to individual or company
   * Note: This is a placeholder - actual ZRA rules might differ
   */
  static getTinType(tin: string): 'individual' | 'company' | 'unknown' {
    if (!tin) return 'unknown';
    
    const cleaned = ZraTinValidator.cleanTin(tin);
    if (cleaned.length !== 10) return 'unknown';
    
    // This is a placeholder implementation
    // Real ZRA TIN might have specific prefixes or patterns for different entity types
    const firstDigit = parseInt(cleaned[0]);
    
    // Example rule (not based on actual ZRA specification):
    // Individual TINs might start with 1-5, company TINs with 6-9
    if (firstDigit >= 1 && firstDigit <= 5) {
      return 'individual';
    } else if (firstDigit >= 6 && firstDigit <= 9) {
      return 'company';
    }
    
    return 'unknown';
  }
}
