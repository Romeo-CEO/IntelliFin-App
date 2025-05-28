import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './customer.repository';
import { ZraTinValidator } from './validators/customer-zra-tin.validator';

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  details: {
    successful: any[];
    failed: any[];
  };
}

export interface ExportOptions {
  format: 'csv' | 'json';
  includeInactive?: boolean;
  fields?: string[];
}

@Injectable()
export class CustomerImportExportService {
  private readonly logger = new Logger(CustomerImportExportService.name);

  constructor(
    private readonly customerService: CustomerService,
    private readonly customerRepository: CustomerRepository,
  ) {}

  /**
   * Import customers from CSV data
   */
  async importCustomersFromCsv(
    organizationId: string,
    csvData: string,
    options: { skipDuplicates?: boolean; updateExisting?: boolean } = {},
  ): Promise<ImportResult> {
    try {
      const { skipDuplicates = true, updateExisting = false } = options;
      
      // Parse CSV data
      const rows = this.parseCsvData(csvData);
      if (rows.length === 0) {
        throw new BadRequestException('No data found in CSV file');
      }

      // Validate headers
      const requiredHeaders = ['name'];
      const optionalHeaders = [
        'contactPerson', 'email', 'phone', 'address', 'city', 'country',
        'zraTin', 'paymentTerms', 'creditLimit', 'notes', 'isActive'
      ];
      const allHeaders = [...requiredHeaders, ...optionalHeaders];
      
      const headers = Object.keys(rows[0]);
      const missingRequired = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingRequired.length > 0) {
        throw new BadRequestException(`Missing required headers: ${missingRequired.join(', ')}`);
      }

      // Validate and process data
      const validationResult = await this.customerService.validateCustomerData(organizationId, rows);
      
      const successful = [];
      const failed = [...validationResult.invalid];
      const errors = [...validationResult.errors];

      // Process valid records
      for (const customerData of validationResult.valid) {
        try {
          // Check for existing customer by email or ZRA TIN
          let existingCustomer = null;
          
          if (customerData.email) {
            existingCustomer = await this.customerRepository.findByEmail(customerData.email, organizationId);
          }
          
          if (!existingCustomer && customerData.zraTin) {
            existingCustomer = await this.customerRepository.findByZraTin(customerData.zraTin, organizationId);
          }

          if (existingCustomer) {
            if (skipDuplicates) {
              failed.push({
                data: customerData,
                errors: ['Customer already exists (skipped)'],
              });
              continue;
            } else if (updateExisting) {
              // Update existing customer
              const updatedCustomer = await this.customerRepository.update(
                existingCustomer.id,
                organizationId,
                customerData,
              );
              successful.push({
                action: 'updated',
                customer: updatedCustomer,
                data: customerData,
              });
            } else {
              failed.push({
                data: customerData,
                errors: ['Customer already exists'],
              });
            }
          } else {
            // Create new customer
            const newCustomer = await this.customerRepository.create({
              organizationId,
              ...customerData,
            });
            successful.push({
              action: 'created',
              customer: newCustomer,
              data: customerData,
            });
          }
        } catch (error) {
          failed.push({
            data: customerData,
            errors: [error.message],
          });
          errors.push(`Failed to process customer ${customerData.name}: ${error.message}`);
        }
      }

      const result: ImportResult = {
        success: failed.length === 0,
        imported: successful.length,
        failed: failed.length,
        errors,
        details: {
          successful,
          failed,
        },
      };

      this.logger.log(`Import completed: ${successful.length} imported, ${failed.length} failed`);
      return result;
    } catch (error) {
      this.logger.error(`Import failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Export customers to CSV format
   */
  async exportCustomersToCsv(
    organizationId: string,
    options: ExportOptions = {},
  ): Promise<string> {
    try {
      const { includeInactive = false, fields } = options;

      // Get customers
      const filters = {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      };

      const customers = await this.customerRepository.findMany(filters);

      // Define export fields
      const defaultFields = [
        'name', 'contactPerson', 'email', 'phone', 'address', 'city', 'country',
        'zraTin', 'paymentTerms', 'creditLimit', 'notes', 'isActive', 'createdAt'
      ];
      const exportFields = fields || defaultFields;

      // Generate CSV
      const csvData = this.generateCsvData(customers, exportFields);
      
      this.logger.log(`Exported ${customers.length} customers to CSV`);
      return csvData;
    } catch (error) {
      this.logger.error(`Export failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Export customers to JSON format
   */
  async exportCustomersToJson(
    organizationId: string,
    options: ExportOptions = {},
  ): Promise<any[]> {
    try {
      const { includeInactive = false, fields } = options;

      // Get customers
      const filters = {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      };

      const customers = await this.customerRepository.findMany(filters);

      // Filter fields if specified
      if (fields && fields.length > 0) {
        return customers.map(customer => {
          const filtered = {};
          fields.forEach(field => {
            if (customer[field] !== undefined) {
              filtered[field] = customer[field];
            }
          });
          return filtered;
        });
      }

      this.logger.log(`Exported ${customers.length} customers to JSON`);
      return customers;
    } catch (error) {
      this.logger.error(`JSON export failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate CSV template for import
   */
  generateImportTemplate(): string {
    const headers = [
      'name', 'contactPerson', 'email', 'phone', 'address', 'city', 'country',
      'zraTin', 'paymentTerms', 'creditLimit', 'notes', 'isActive'
    ];

    const sampleData = [
      {
        name: 'Acme Corporation Ltd',
        contactPerson: 'John Mwanza',
        email: 'contact@acmecorp.zm',
        phone: '+260977123456',
        address: 'Plot 123, Independence Avenue',
        city: 'Lusaka',
        country: 'Zambia',
        zraTin: '1234567890',
        paymentTerms: '30',
        creditLimit: '50000',
        notes: 'Preferred payment method: Mobile Money',
        isActive: 'true'
      },
      {
        name: 'Small Business Ltd',
        contactPerson: 'Mary Banda',
        email: 'info@smallbiz.zm',
        phone: '+260966789012',
        address: 'Shop 45, Cairo Road',
        city: 'Lusaka',
        country: 'Zambia',
        zraTin: '',
        paymentTerms: '14',
        creditLimit: '',
        notes: '',
        isActive: 'true'
      }
    ];

    return this.generateCsvData(sampleData, headers);
  }

  /**
   * Parse CSV data into objects
   */
  private parseCsvData(csvData: string): any[] {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          
          // Convert specific fields to appropriate types
          if (header === 'paymentTerms' || header === 'creditLimit') {
            row[header] = value && !isNaN(value) ? parseFloat(value) : undefined;
          } else if (header === 'isActive') {
            row[header] = value ? value.toLowerCase() === 'true' : true;
          } else {
            row[header] = value || undefined;
          }
        });
        rows.push(row);
      }
    }

    return rows;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCsvLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result.map(value => value.replace(/^"|"$/g, ''));
  }

  /**
   * Generate CSV data from objects
   */
  private generateCsvData(data: any[], fields: string[]): string {
    if (data.length === 0) {
      return fields.join(',') + '\n';
    }

    const headers = fields.join(',');
    const rows = data.map(item => {
      return fields.map(field => {
        let value = item[field];
        
        // Handle different data types
        if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'object' && value instanceof Date) {
          value = value.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
        } else if (typeof value === 'boolean') {
          value = value.toString();
        } else {
          value = value.toString();
        }

        // Escape quotes and wrap in quotes if contains comma or quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }

        return value;
      }).join(',');
    });

    return [headers, ...rows].join('\n');
  }
}
