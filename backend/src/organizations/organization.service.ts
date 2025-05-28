import { 
  Injectable, 
  ConflictException, 
  NotFoundException,
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { Organization } from '@prisma/client';
import { OrganizationRepository } from './organization.repository';
import { 
  CreateOrganizationDto, 
  UpdateOrganizationDto,
  OrganizationResponseDto 
} from './dto/organization.dto';
import { ZraTinValidator } from './validators/zra-tin.validator';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    this.logger.log(`Creating organization: ${createOrganizationDto.name}`);

    // Validate ZRA TIN format
    if (!this.validateZraTin(createOrganizationDto.zraTin)) {
      throw new BadRequestException('Invalid ZRA TIN format');
    }

    // Check if ZRA TIN already exists
    const existingOrg = await this.organizationRepository.findByZraTin(createOrganizationDto.zraTin);
    if (existingOrg) {
      throw new ConflictException('An organization with this ZRA TIN already exists');
    }

    try {
      const organization = await this.organizationRepository.create({
        name: createOrganizationDto.name,
        businessType: createOrganizationDto.businessType,
        zraTin: createOrganizationDto.zraTin,
        address: createOrganizationDto.address,
        city: createOrganizationDto.city,
        country: createOrganizationDto.country || 'Zambia',
        phone: createOrganizationDto.phone,
        email: createOrganizationDto.email,
        website: createOrganizationDto.website,
        industry: createOrganizationDto.industry,
        bankName: createOrganizationDto.bankName,
        bankAccountNumber: createOrganizationDto.bankAccountNumber,
        bankBranch: createOrganizationDto.bankBranch,
        defaultCurrency: createOrganizationDto.defaultCurrency || 'ZMW',
        fiscalYearStart: createOrganizationDto.fiscalYearStart || 1,
        primaryColor: createOrganizationDto.primaryColor,
        secondaryColor: createOrganizationDto.secondaryColor,
      });

      this.logger.log(`Organization created successfully: ${organization.id}`);
      return this.mapToResponseDto(organization);
    } catch (error) {
      this.logger.error(`Failed to create organization: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create organization');
    }
  }

  async findById(id: string): Promise<OrganizationResponseDto> {
    this.logger.log(`Finding organization by ID: ${id}`);

    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.mapToResponseDto(organization);
  }

  async findByZraTin(zraTin: string): Promise<OrganizationResponseDto> {
    this.logger.log(`Finding organization by ZRA TIN: ${zraTin}`);

    const organization = await this.organizationRepository.findByZraTin(zraTin);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.mapToResponseDto(organization);
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<OrganizationResponseDto> {
    this.logger.log(`Updating organization: ${id}`);

    // Check if organization exists
    const existingOrg = await this.organizationRepository.findById(id);
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    try {
      const organization = await this.organizationRepository.update(id, {
        name: updateOrganizationDto.name,
        businessType: updateOrganizationDto.businessType,
        address: updateOrganizationDto.address,
        city: updateOrganizationDto.city,
        phone: updateOrganizationDto.phone,
        email: updateOrganizationDto.email,
        website: updateOrganizationDto.website,
        industry: updateOrganizationDto.industry,
      });

      this.logger.log(`Organization updated successfully: ${organization.id}`);
      return this.mapToResponseDto(organization);
    } catch (error) {
      this.logger.error(`Failed to update organization: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update organization');
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting organization: ${id}`);

    const existingOrg = await this.organizationRepository.findById(id);
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    try {
      await this.organizationRepository.delete(id);
      this.logger.log(`Organization deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete organization: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete organization');
    }
  }

  async validateZraTinAvailability(zraTin: string, excludeId?: string): Promise<boolean> {
    this.logger.log(`Validating ZRA TIN availability: ${zraTin}`);

    if (!this.validateZraTin(zraTin)) {
      return false;
    }

    const exists = await this.organizationRepository.existsByZraTin(zraTin, excludeId);
    return !exists;
  }

  private validateZraTin(zraTin: string): boolean {
    const validator = new ZraTinValidator();
    return validator.validate(zraTin, {} as any);
  }

  private mapToResponseDto(organization: Organization): OrganizationResponseDto {
    return {
      id: organization.id,
      name: organization.name,
      businessType: organization.businessType as any,
      zraTin: organization.zraTin,
      address: organization.address,
      city: organization.city,
      country: organization.country,
      phone: organization.phone,
      email: organization.email,
      website: organization.website,
      industry: organization.industry as any,
      defaultCurrency: organization.defaultCurrency,
      fiscalYearStart: organization.fiscalYearStart,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  /**
   * Get business type options for Zambian businesses
   */
  getBusinessTypeOptions() {
    return [
      { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
      { value: 'PARTNERSHIP', label: 'Partnership' },
      { value: 'LIMITED_LIABILITY_COMPANY', label: 'Limited Liability Company' },
      { value: 'PUBLIC_LIMITED_COMPANY', label: 'Public Limited Company' },
      { value: 'COOPERATIVE', label: 'Cooperative' },
      { value: 'NGO', label: 'Non-Governmental Organization' },
      { value: 'TRUST', label: 'Trust' },
      { value: 'BRANCH_OFFICE', label: 'Branch Office' },
      { value: 'REPRESENTATIVE_OFFICE', label: 'Representative Office' },
    ];
  }

  /**
   * Get industry options for Zambian businesses
   */
  getIndustryOptions() {
    return [
      { value: 'AGRICULTURE', label: 'Agriculture, Forestry and Fishing' },
      { value: 'MINING', label: 'Mining and Quarrying' },
      { value: 'MANUFACTURING', label: 'Manufacturing' },
      { value: 'CONSTRUCTION', label: 'Construction' },
      { value: 'WHOLESALE_RETAIL', label: 'Wholesale and Retail Trade' },
      { value: 'TRANSPORT_LOGISTICS', label: 'Transportation and Storage' },
      { value: 'ACCOMMODATION_FOOD', label: 'Accommodation and Food Service' },
      { value: 'INFORMATION_COMMUNICATION', label: 'Information and Communication' },
      { value: 'FINANCIAL_INSURANCE', label: 'Financial and Insurance Activities' },
      { value: 'REAL_ESTATE', label: 'Real Estate Activities' },
      { value: 'PROFESSIONAL_SERVICES', label: 'Professional, Scientific and Technical Activities' },
      { value: 'EDUCATION', label: 'Education' },
      { value: 'HEALTH_SOCIAL', label: 'Human Health and Social Work' },
      { value: 'ARTS_ENTERTAINMENT', label: 'Arts, Entertainment and Recreation' },
      { value: 'OTHER_SERVICES', label: 'Other Service Activities' },
    ];
  }
}
