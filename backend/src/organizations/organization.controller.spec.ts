import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import {
  CreateOrganizationDto,
  ZambianBusinessType,
  ZambianIndustry,
} from './dto/organization.dto';

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let service: OrganizationService;

  const mockOrganizationService = {
    create: jest.fn(),
    findById: jest.fn(),
    findByZraTin: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    validateZraTinAvailability: jest.fn(),
    getBusinessTypeOptions: jest.fn(),
    getIndustryOptions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        {
          provide: OrganizationService,
          useValue: mockOrganizationService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationController>(OrganizationController);
    service = module.get<OrganizationService>(OrganizationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an organization', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'Test Company Ltd',
        businessType: ZambianBusinessType.LIMITED_LIABILITY_COMPANY,
        zraTin: '4567890123',
        industry: ZambianIndustry.WHOLESALE_RETAIL,
        address: 'Plot 123, Cairo Road',
        city: 'Lusaka',
        country: 'Zambia',
        phone: '+260977123456',
        email: 'info@testcompany.co.zm',
      };

      const expectedResult = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...createDto,
        defaultCurrency: 'ZMW',
        fiscalYearStart: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrganizationService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto, { id: 'user-id' });

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('validateZraTin', () => {
    it('should validate ZRA TIN availability', async () => {
      const zraTin = '4567890123';
      const expectedResult = {
        isValid: true,
        isAvailable: true,
        message: 'ZRA TIN is valid and available',
      };

      mockOrganizationService.validateZraTinAvailability.mockResolvedValue(
        true
      );

      const result = await controller.validateZraTin(zraTin);

      expect(service.validateZraTinAvailability).toHaveBeenCalledWith(
        zraTin,
        undefined
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return unavailable for existing ZRA TIN', async () => {
      const zraTin = '4567890123';
      const expectedResult = {
        isValid: true,
        isAvailable: false,
        message: 'ZRA TIN is already in use by another organization',
      };

      mockOrganizationService.validateZraTinAvailability.mockResolvedValue(
        false
      );

      const result = await controller.validateZraTin(zraTin);

      expect(service.validateZraTinAvailability).toHaveBeenCalledWith(
        zraTin,
        undefined
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getBusinessTypeOptions', () => {
    it('should return business type options', async () => {
      const expectedOptions = [
        { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
        {
          value: 'LIMITED_LIABILITY_COMPANY',
          label: 'Limited Liability Company',
        },
      ];

      mockOrganizationService.getBusinessTypeOptions.mockReturnValue(
        expectedOptions
      );

      const result = await controller.getBusinessTypeOptions();

      expect(service.getBusinessTypeOptions).toHaveBeenCalled();
      expect(result).toEqual(expectedOptions);
    });
  });

  describe('getIndustryOptions', () => {
    it('should return industry options', async () => {
      const expectedOptions = [
        { value: 'AGRICULTURE', label: 'Agriculture, Forestry and Fishing' },
        { value: 'MANUFACTURING', label: 'Manufacturing' },
      ];

      mockOrganizationService.getIndustryOptions.mockReturnValue(
        expectedOptions
      );

      const result = await controller.getIndustryOptions();

      expect(service.getIndustryOptions).toHaveBeenCalled();
      expect(result).toEqual(expectedOptions);
    });
  });
});
