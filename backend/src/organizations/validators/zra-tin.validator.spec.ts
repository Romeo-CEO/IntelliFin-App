import { ZraTinValidator } from './zra-tin.validator';

describe('ZraTinValidator', () => {
  let validator: ZraTinValidator;

  beforeEach(() => {
    validator = new ZraTinValidator();
  });

  describe('validate', () => {
    it('should validate correct company TIN format', () => {
      const validTins = [
        '4567890123',
        '5123456789',
        '6987654321',
      ];

      validTins.forEach(tin => {
        expect(validator.validate(tin, {} as any)).toBe(true);
      });
    });

    it('should reject invalid TIN formats', () => {
      const invalidTins = [
        '', // empty
        '123456789', // 9 digits
        '12345678901', // 11 digits
        'abcd123456', // contains letters
        '1234567890', // starts with 1 (individual)
        '2234567890', // starts with 2 (individual)
        '3234567890', // starts with 3 (individual)
        '0234567890', // starts with 0 (invalid)
      ];

      invalidTins.forEach(tin => {
        expect(validator.validate(tin, {} as any)).toBe(false);
      });
    });

    it('should handle TINs with spaces and hyphens', () => {
      const formattedTins = [
        '456 789 0123',
        '456-789-0123',
        '456 789-0123',
        ' 4567890123 ',
      ];

      formattedTins.forEach(tin => {
        expect(validator.validate(tin, {} as any)).toBe(true);
      });
    });
  });

  describe('isCompanyTin', () => {
    it('should identify company TINs correctly', () => {
      const companyTins = [
        '4567890123',
        '5123456789',
        '6987654321',
      ];

      companyTins.forEach(tin => {
        expect(ZraTinValidator.isCompanyTin(tin)).toBe(true);
      });
    });

    it('should reject individual TINs', () => {
      const individualTins = [
        '1234567890',
        '2234567890',
        '3234567890',
      ];

      individualTins.forEach(tin => {
        expect(ZraTinValidator.isCompanyTin(tin)).toBe(false);
      });
    });
  });

  describe('isIndividualTin', () => {
    it('should identify individual TINs correctly', () => {
      const individualTins = [
        '1234567890',
        '2234567890',
        '3234567890',
      ];

      individualTins.forEach(tin => {
        expect(ZraTinValidator.isIndividualTin(tin)).toBe(true);
      });
    });

    it('should reject company TINs', () => {
      const companyTins = [
        '4567890123',
        '5123456789',
        '6987654321',
      ];

      companyTins.forEach(tin => {
        expect(ZraTinValidator.isIndividualTin(tin)).toBe(false);
      });
    });
  });

  describe('formatTin', () => {
    it('should format TIN with standard spacing', () => {
      const testCases = [
        { input: '4567890123', expected: '456-789-0123' },
        { input: '456 789 0123', expected: '456-789-0123' },
        { input: '456-789-0123', expected: '456-789-0123' },
        { input: '123456789', expected: '123456789' }, // Invalid length
        { input: '', expected: '' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(ZraTinValidator.formatTin(input)).toBe(expected);
      });
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      const message = validator.defaultMessage({} as any);
      expect(message).toBe('ZRA TIN must be a valid 10-digit Zambian Tax Identification Number');
    });
  });
});
