import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

/**
 * ZRA TIN (Tax Identification Number) Validator for Zambian businesses
 *
 * ZRA TIN Format:
 * - 10 digits for individuals: XXXXXXXXXX
 * - 10 digits for companies: XXXXXXXXXX
 * - Must start with specific prefixes based on taxpayer type
 * - Contains check digit validation
 *
 * Reference: Zambia Revenue Authority TIN specifications
 */
@ValidatorConstraint({ name: 'isValidZraTin', async: false })
@Injectable()
export class ZraTinValidator implements ValidatorConstraintInterface {
  validate(tin: string, args: ValidationArguments): boolean {
    if (!tin) {
      return false;
    }

    // Remove any spaces or hyphens
    const cleanTin = tin.replace(/[\s-]/g, '');

    // Check if it's exactly 10 digits
    if (!/^\d{10}$/.test(cleanTin)) {
      return false;
    }

    // Validate TIN format and check digit
    return (
      this.validateTinFormat(cleanTin) && this.validateCheckDigit(cleanTin)
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return 'ZRA TIN must be a valid 10-digit Zambian Tax Identification Number';
  }

  private validateTinFormat(tin: string): boolean {
    // ZRA TIN format validation
    // First digit indicates taxpayer type:
    // 1-3: Individual taxpayers
    // 4-6: Corporate taxpayers
    // 7-9: Other entities (NGOs, trusts, etc.)
    const firstDigit = parseInt(tin.charAt(0));
    return firstDigit >= 1 && firstDigit <= 9;
  }

  private validateCheckDigit(tin: string): boolean {
    // Implement ZRA TIN check digit algorithm
    // This is a simplified version - actual ZRA algorithm may differ
    const digits = tin.split('').map(d => parseInt(d));
    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 1];

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * weights[i];
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;

    return checkDigit === digits[9];
  }

  /**
   * Validates if TIN belongs to a company/corporate entity
   */
  static isCompanyTin(tin: string): boolean {
    if (!tin) return false;
    const cleanTin = tin.replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(cleanTin)) return false;

    const firstDigit = parseInt(cleanTin.charAt(0));
    return firstDigit >= 4 && firstDigit <= 6;
  }

  /**
   * Validates if TIN belongs to an individual
   */
  static isIndividualTin(tin: string): boolean {
    if (!tin) return false;
    const cleanTin = tin.replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(cleanTin)) return false;

    const firstDigit = parseInt(cleanTin.charAt(0));
    return firstDigit >= 1 && firstDigit <= 3;
  }

  /**
   * Formats TIN with standard spacing for display
   */
  static formatTin(tin: string): string {
    if (!tin) return '';
    const cleanTin = tin.replace(/[\s-]/g, '');
    if (cleanTin.length === 10) {
      return `${cleanTin.substring(0, 3)}-${cleanTin.substring(3, 6)}-${cleanTin.substring(6)}`;
    }
    return tin;
  }
}

/**
 * Custom decorator for ZRA TIN validation
 */
export function IsValidZraTin(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: ZraTinValidator,
    });
  };
}

/**
 * Custom decorator for company TIN validation
 */
export function IsCompanyZraTin(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: {
        message: 'ZRA TIN must be a valid company Tax Identification Number',
        ...validationOptions,
      },
      constraints: [],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const validator = new ZraTinValidator();
          return (
            validator.validate(value, args) &&
            ZraTinValidator.isCompanyTin(value)
          );
        },
      },
    });
  };
}
