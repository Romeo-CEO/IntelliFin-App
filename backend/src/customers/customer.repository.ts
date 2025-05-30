import { Injectable, Logger } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface CreateCustomerData {
  organizationId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zraTin?: string;
  paymentTerms?: number;
  creditLimit?: number;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateCustomerData {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zraTin?: string;
  paymentTerms?: number;
  creditLimit?: number;
  notes?: string;
  isActive?: boolean;
}

export interface CustomerFilters {
  organizationId: string;
  search?: string;
  isActive?: boolean;
  city?: string;
  hasZraTin?: boolean;
  paymentTermsMin?: number;
  paymentTermsMax?: number;
  creditLimitMin?: number;
  creditLimitMax?: number;
}

export interface CustomerWithStats extends Customer {
  _count?: {
    invoices: number;
    payments: number;
  };
  totalInvoiceAmount?: number;
  totalPaidAmount?: number;
  outstandingBalance?: number;
}

@Injectable()
export class CustomerRepository {
  private readonly logger = new Logger(CustomerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new customer
   */
  async create(data: CreateCustomerData): Promise<Customer> {
    try {
      return await this.prisma.customer.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          contactPerson: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          country: data.country || 'Zambia',
          zraTin: data.zraTin,
          paymentTerms: data.paymentTerms || 14,
          creditLimit: data.creditLimit,
          notes: data.notes,
          isActive: data.isActive ?? true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create customer: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find customer by ID
   */
  async findById(id: string, organizationId: string): Promise<Customer | null> {
    try {
      return await this.prisma.customer.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find customer by ID: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find customer by ID with statistics
   */
  async findByIdWithStats(
    id: string,
    organizationId: string
  ): Promise<CustomerWithStats | null> {
    try {
      return await this.prisma.customer.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              invoices: true,
              payments: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find customer with stats: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find customers with filters
   */
  async findMany(
    filters: CustomerFilters,
    orderBy: Prisma.CustomerOrderByWithRelationInput = { name: 'asc' },
    skip?: number,
    take?: number
  ): Promise<Customer[]> {
    try {
      const where = this.buildWhereClause(filters);

      return await this.prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take,
      });
    } catch (error) {
      this.logger.error(`Failed to find customers: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Count customers with filters
   */
  async count(filters: CustomerFilters): Promise<number> {
    try {
      const where = this.buildWhereClause(filters);
      return await this.prisma.customer.count({ where });
    } catch (error) {
      this.logger.error(`Failed to count customers: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update customer
   */
  async update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData
  ): Promise<Customer> {
    try {
      return await this.prisma.customer.update({
        where: {
          id,
          organizationId,
        },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update customer: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Soft delete customer
   */
  async softDelete(id: string, organizationId: string): Promise<Customer> {
    try {
      return await this.prisma.customer.update({
        where: {
          id,
          organizationId,
        },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to delete customer: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find customer by ZRA TIN
   */
  async findByZraTin(
    zraTin: string,
    organizationId: string
  ): Promise<Customer | null> {
    try {
      return await this.prisma.customer.findFirst({
        where: {
          zraTin,
          organizationId,
          deletedAt: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find customer by ZRA TIN: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Find customer by email
   */
  async findByEmail(
    email: string,
    organizationId: string
  ): Promise<Customer | null> {
    try {
      return await this.prisma.customer.findFirst({
        where: {
          email,
          organizationId,
          deletedAt: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find customer by email: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(organizationId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    withZraTin: number;
    averagePaymentTerms: number;
  }> {
    try {
      const [total, active, withZraTin, avgPaymentTerms] = await Promise.all([
        this.prisma.customer.count({
          where: { organizationId, deletedAt: null },
        }),
        this.prisma.customer.count({
          where: { organizationId, isActive: true, deletedAt: null },
        }),
        this.prisma.customer.count({
          where: { organizationId, zraTin: { not: null }, deletedAt: null },
        }),
        this.prisma.customer.aggregate({
          where: { organizationId, deletedAt: null },
          _avg: { paymentTerms: true },
        }),
      ]);

      return {
        total,
        active,
        inactive: total - active,
        withZraTin,
        averagePaymentTerms: Math.round(
          avgPaymentTerms._avg.paymentTerms || 14
        ),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get customer stats: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Build where clause for filters
   */
  private buildWhereClause(
    filters: CustomerFilters
  ): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { contactPerson: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { zraTin: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.hasZraTin !== undefined) {
      where.zraTin = filters.hasZraTin ? { not: null } : null;
    }

    if (
      filters.paymentTermsMin !== undefined ||
      filters.paymentTermsMax !== undefined
    ) {
      where.paymentTerms = {};
      if (filters.paymentTermsMin !== undefined) {
        where.paymentTerms.gte = filters.paymentTermsMin;
      }
      if (filters.paymentTermsMax !== undefined) {
        where.paymentTerms.lte = filters.paymentTermsMax;
      }
    }

    if (
      filters.creditLimitMin !== undefined ||
      filters.creditLimitMax !== undefined
    ) {
      where.creditLimit = {};
      if (filters.creditLimitMin !== undefined) {
        where.creditLimit.gte = filters.creditLimitMin;
      }
      if (filters.creditLimitMax !== undefined) {
        where.creditLimit.lte = filters.creditLimitMax;
      }
    }

    return where;
  }
}
