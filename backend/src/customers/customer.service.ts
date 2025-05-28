import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  ConflictException, 
  BadRequestException 
} from '@nestjs/common';
import { Customer } from '@prisma/client';
import { CustomerRepository, CreateCustomerData, UpdateCustomerData, CustomerFilters } from './customer.repository';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto/customer.dto';
import { ZraTinValidator } from './validators/customer-zra-tin.validator';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly customerRepository: CustomerRepository,
  ) {}

  /**
   * Create a new customer
   */
  async createCustomer(organizationId: string, createCustomerDto: CreateCustomerDto): Promise<Customer> {
    try {
      // Validate ZRA TIN if provided
      if (createCustomerDto.zraTin) {
        const tinValidation = ZraTinValidator.validateWithDetails(createCustomerDto.zraTin);
        if (!tinValidation.isValid) {
          throw new BadRequestException(`Invalid ZRA TIN: ${tinValidation.errors.join(', ')}`);
        }
        createCustomerDto.zraTin = tinValidation.cleaned;
      }

      // Check for duplicate email within organization
      if (createCustomerDto.email) {
        const existingCustomerByEmail = await this.customerRepository.findByEmail(
          createCustomerDto.email,
          organizationId,
        );
        if (existingCustomerByEmail) {
          throw new ConflictException('A customer with this email already exists');
        }
      }

      // Check for duplicate ZRA TIN within organization
      if (createCustomerDto.zraTin) {
        const existingCustomerByTin = await this.customerRepository.findByZraTin(
          createCustomerDto.zraTin,
          organizationId,
        );
        if (existingCustomerByTin) {
          throw new ConflictException('A customer with this ZRA TIN already exists');
        }
      }

      const customerData: CreateCustomerData = {
        organizationId,
        ...createCustomerDto,
      };

      const customer = await this.customerRepository.create(customerData);
      
      this.logger.log(`Created customer: ${customer.name} (${customer.id}) for organization ${organizationId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create customer: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string, organizationId: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id, organizationId);
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Get customer by ID with statistics
   */
  async getCustomerByIdWithStats(id: string, organizationId: string) {
    const customer = await this.customerRepository.findByIdWithStats(id, organizationId);
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Get customers with filters and pagination
   */
  async getCustomers(organizationId: string, query: CustomerQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
      ...filters
    } = query;

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const customerFilters: CustomerFilters = {
      organizationId,
      ...filters,
    };

    const [customers, total] = await Promise.all([
      this.customerRepository.findMany(customerFilters, orderBy, skip, limit),
      this.customerRepository.count(customerFilters),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      customers,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update customer
   */
  async updateCustomer(
    id: string,
    organizationId: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    try {
      // Check if customer exists
      const existingCustomer = await this.getCustomerById(id, organizationId);

      // Validate ZRA TIN if provided
      if (updateCustomerDto.zraTin) {
        const tinValidation = ZraTinValidator.validateWithDetails(updateCustomerDto.zraTin);
        if (!tinValidation.isValid) {
          throw new BadRequestException(`Invalid ZRA TIN: ${tinValidation.errors.join(', ')}`);
        }
        updateCustomerDto.zraTin = tinValidation.cleaned;
      }

      // Check for duplicate email within organization (excluding current customer)
      if (updateCustomerDto.email && updateCustomerDto.email !== existingCustomer.email) {
        const existingCustomerByEmail = await this.customerRepository.findByEmail(
          updateCustomerDto.email,
          organizationId,
        );
        if (existingCustomerByEmail && existingCustomerByEmail.id !== id) {
          throw new ConflictException('A customer with this email already exists');
        }
      }

      // Check for duplicate ZRA TIN within organization (excluding current customer)
      if (updateCustomerDto.zraTin && updateCustomerDto.zraTin !== existingCustomer.zraTin) {
        const existingCustomerByTin = await this.customerRepository.findByZraTin(
          updateCustomerDto.zraTin,
          organizationId,
        );
        if (existingCustomerByTin && existingCustomerByTin.id !== id) {
          throw new ConflictException('A customer with this ZRA TIN already exists');
        }
      }

      const updateData: UpdateCustomerData = updateCustomerDto;
      const customer = await this.customerRepository.update(id, organizationId, updateData);
      
      this.logger.log(`Updated customer: ${customer.name} (${customer.id})`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to update customer: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete customer (soft delete)
   */
  async deleteCustomer(id: string, organizationId: string): Promise<void> {
    try {
      // Check if customer exists
      await this.getCustomerById(id, organizationId);

      // TODO: Check if customer has associated invoices or payments
      // For now, we'll allow deletion but in production you might want to prevent
      // deletion of customers with financial records

      await this.customerRepository.softDelete(id, organizationId);
      
      this.logger.log(`Deleted customer: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete customer: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(organizationId: string) {
    return await this.customerRepository.getCustomerStats(organizationId);
  }

  /**
   * Search customers by name, email, or phone
   */
  async searchCustomers(organizationId: string, searchTerm: string, limit = 10) {
    const filters: CustomerFilters = {
      organizationId,
      search: searchTerm,
      isActive: true,
    };

    return await this.customerRepository.findMany(
      filters,
      { name: 'asc' },
      0,
      limit,
    );
  }

  /**
   * Get customers for dropdown/select options
   */
  async getCustomersForSelect(organizationId: string) {
    const filters: CustomerFilters = {
      organizationId,
      isActive: true,
    };

    const customers = await this.customerRepository.findMany(
      filters,
      { name: 'asc' },
    );

    return customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      zraTin: customer.zraTin,
    }));
  }

  /**
   * Validate customer data for import
   */
  async validateCustomerData(organizationId: string, customerData: any[]): Promise<{
    valid: any[];
    invalid: any[];
    errors: string[];
  }> {
    const valid = [];
    const invalid = [];
    const errors = [];

    for (let i = 0; i < customerData.length; i++) {
      const row = customerData[i];
      const rowErrors = [];

      // Validate required fields
      if (!row.name || row.name.trim().length < 2) {
        rowErrors.push('Name is required and must be at least 2 characters');
      }

      // Validate email if provided
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        rowErrors.push('Invalid email format');
      }

      // Validate ZRA TIN if provided
      if (row.zraTin) {
        const tinValidation = ZraTinValidator.validateWithDetails(row.zraTin);
        if (!tinValidation.isValid) {
          rowErrors.push(`Invalid ZRA TIN: ${tinValidation.errors.join(', ')}`);
        }
      }

      // Validate payment terms
      if (row.paymentTerms && (isNaN(row.paymentTerms) || row.paymentTerms < 0 || row.paymentTerms > 365)) {
        rowErrors.push('Payment terms must be a number between 0 and 365');
      }

      // Validate credit limit
      if (row.creditLimit && (isNaN(row.creditLimit) || row.creditLimit < 0)) {
        rowErrors.push('Credit limit must be a positive number');
      }

      if (rowErrors.length > 0) {
        invalid.push({ row: i + 1, data: row, errors: rowErrors });
        errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
      } else {
        valid.push({
          ...row,
          organizationId,
          country: row.country || 'Zambia',
          paymentTerms: row.paymentTerms || 14,
          isActive: row.isActive !== false,
        });
      }
    }

    return { valid, invalid, errors };
  }
}
