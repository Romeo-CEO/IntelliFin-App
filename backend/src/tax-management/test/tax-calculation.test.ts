import { Test, TestingModule } from '@nestjs/testing';
import { TaxCalculationService, TaxCalculationRequest } from '../services/tax-calculation.service';
import { PrismaService } from '../../database/prisma.service';
import { TaxType } from '@prisma/client';

describe('TaxCalculationService', () => {
  let service: TaxCalculationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    taxRate: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxCalculationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TaxCalculationService>(TaxCalculationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('VAT Calculation', () => {
    it('should calculate VAT correctly for exclusive amount', async () => {
      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.VAT,
        amount: 1000,
        isInclusive: false,
      };

      const result = await service.calculateTax(request);

      expect(result.taxType).toBe(TaxType.VAT);
      expect(result.netAmount).toBe(1000);
      expect(result.taxAmount).toBe(160); // 16% of 1000
      expect(result.grossAmount).toBe(1160);
      expect(result.taxRate).toBe(0.16);
      expect(result.isInclusive).toBe(false);
    });

    it('should calculate VAT correctly for inclusive amount', async () => {
      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.VAT,
        amount: 1160,
        isInclusive: true,
      };

      const result = await service.calculateTax(request);

      expect(result.taxType).toBe(TaxType.VAT);
      expect(result.grossAmount).toBe(1160);
      expect(result.netAmount).toBe(1000);
      expect(result.taxAmount).toBe(160);
      expect(result.taxRate).toBe(0.16);
      expect(result.isInclusive).toBe(true);
    });
  });

  describe('Withholding Tax Calculation', () => {
    it('should calculate withholding tax correctly', async () => {
      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.WITHHOLDING_TAX,
        amount: 10000,
      };

      const result = await service.calculateTax(request);

      expect(result.taxType).toBe(TaxType.WITHHOLDING_TAX);
      expect(result.grossAmount).toBe(10000);
      expect(result.taxAmount).toBe(1500); // 15% of 10000
      expect(result.netAmount).toBe(8500);
      expect(result.taxRate).toBe(0.15);
    });
  });

  describe('Income Tax Calculation', () => {
    it('should calculate income tax using Zambian brackets', async () => {
      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.INCOME_TAX,
        amount: 20000, // Above the highest bracket
      };

      const result = await service.calculateTax(request);

      expect(result.taxType).toBe(TaxType.INCOME_TAX);
      expect(result.grossAmount).toBe(20000);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.netAmount).toBe(20000 - result.taxAmount);
    });

    it('should calculate zero tax for income below threshold', async () => {
      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.INCOME_TAX,
        amount: 4000, // Below K4,800 threshold
      };

      const result = await service.calculateTax(request);

      expect(result.taxType).toBe(TaxType.INCOME_TAX);
      expect(result.grossAmount).toBe(4000);
      expect(result.taxAmount).toBe(0);
      expect(result.netAmount).toBe(4000);
    });
  });

  describe('PAYE Calculation', () => {
    it('should calculate PAYE using same brackets as income tax', async () => {
      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.PAYE,
        amount: 15000,
      };

      const result = await service.calculateTax(request);

      expect(result.taxType).toBe(TaxType.PAYE);
      expect(result.grossAmount).toBe(15000);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.netAmount).toBe(15000 - result.taxAmount);
    });
  });

  describe('Turnover Tax Calculation', () => {
    it('should calculate turnover tax at 4%', async () => {
      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.TURNOVER_TAX,
        amount: 50000,
      };

      const result = await service.calculateTax(request);

      expect(result.taxType).toBe(TaxType.TURNOVER_TAX);
      expect(result.grossAmount).toBe(50000);
      expect(result.taxAmount).toBe(2000); // 4% of 50000
      expect(result.netAmount).toBe(48000);
      expect(result.taxRate).toBe(0.04);
    });
  });

  describe('Custom Tax Rates', () => {
    it('should use custom organization tax rate when available', async () => {
      // Mock custom VAT rate
      mockPrismaService.taxRate.findFirst.mockResolvedValue({
        rate: { toNumber: () => 0.20 }, // 20% custom rate
      });

      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.VAT,
        amount: 1000,
        isInclusive: false,
      };

      const result = await service.calculateTax(request);

      expect(result.taxRate).toBe(0.20);
      expect(result.taxAmount).toBe(200); // 20% of 1000
    });

    it('should fall back to default rate when custom rate not found', async () => {
      // Mock no custom rate found
      mockPrismaService.taxRate.findFirst.mockResolvedValue(null);

      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.VAT,
        amount: 1000,
        isInclusive: false,
      };

      const result = await service.calculateTax(request);

      expect(result.taxRate).toBe(0.16); // Default Zambian VAT rate
      expect(result.taxAmount).toBe(160);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockPrismaService.taxRate.findFirst.mockRejectedValue(new Error('Database error'));

      const request: TaxCalculationRequest = {
        organizationId: 'test-org-id',
        taxType: TaxType.VAT,
        amount: 1000,
        isInclusive: false,
      };

      // Should still work with default rates
      const result = await service.calculateTax(request);

      expect(result.taxRate).toBe(0.16); // Default rate
      expect(result.taxAmount).toBe(160);
    });
  });
});
