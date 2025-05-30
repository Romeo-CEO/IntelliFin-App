import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaxPeriod, TaxPeriodStatus, TaxType } from '@prisma/client';

export interface CreateTaxPeriodDto {
  organizationId: string;
  taxType: TaxType;
  year: number;
  quarter?: number;
  month?: number;
  customPeriodStart?: Date;
  customPeriodEnd?: Date;
}

export interface TaxPeriodWithObligations extends TaxPeriod {
  obligations: Array<{
    id: string;
    obligationType: string;
    amountDue: number;
    amountPaid: number;
    status: string;
    dueDate: Date;
  }>;
}

export interface TaxCalendarEntry {
  taxType: TaxType;
  periodStart: Date;
  periodEnd: Date;
  filingDeadline: Date;
  paymentDeadline: Date;
  status: TaxPeriodStatus;
  isOverdue: boolean;
  daysUntilDeadline: number;
}

@Injectable()
export class TaxPeriodService {
  private readonly logger = new Logger(TaxPeriodService.name);

  // Zambian tax period configurations
  private readonly TAX_PERIOD_CONFIG = {
    [TaxType.VAT]: {
      frequency: 'quarterly',
      filingDaysAfterPeriod: 18,
      paymentDaysAfterPeriod: 18,
    },
    [TaxType.INCOME_TAX]: {
      frequency: 'annually',
      filingDaysAfterPeriod: 90, // 90 days after year end
      paymentDaysAfterPeriod: 90,
    },
    [TaxType.PAYE]: {
      frequency: 'monthly',
      filingDaysAfterPeriod: 10, // 10th of following month
      paymentDaysAfterPeriod: 10,
    },
    [TaxType.WITHHOLDING_TAX]: {
      frequency: 'monthly',
      filingDaysAfterPeriod: 14, // 14th of following month
      paymentDaysAfterPeriod: 14,
    },
    [TaxType.ADVANCE_TAX]: {
      frequency: 'quarterly',
      filingDaysAfterPeriod: 30,
      paymentDaysAfterPeriod: 30,
    },
    [TaxType.TURNOVER_TAX]: {
      frequency: 'monthly',
      filingDaysAfterPeriod: 18,
      paymentDaysAfterPeriod: 18,
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create tax periods for an organization
   */
  async createTaxPeriod(dto: CreateTaxPeriodDto): Promise<TaxPeriod> {
    try {
      this.logger.log(`Creating tax period for ${dto.taxType} - ${dto.year}`);

      const config = this.TAX_PERIOD_CONFIG[dto.taxType];
      if (!config) {
        throw new BadRequestException(`Unsupported tax type: ${dto.taxType}`);
      }

      const { periodStart, periodEnd } = this.calculatePeriodDates(dto, config);
      const { filingDeadline, paymentDeadline } = this.calculateDeadlines(
        periodEnd,
        config
      );

      // Check if period already exists
      const existingPeriod = await this.prisma.taxPeriod.findFirst({
        where: {
          organizationId: dto.organizationId,
          taxType: dto.taxType,
          periodStart,
          periodEnd,
        },
      });

      if (existingPeriod) {
        throw new BadRequestException(
          'Tax period already exists for this date range'
        );
      }

      const taxPeriod = await this.prisma.taxPeriod.create({
        data: {
          organizationId: dto.organizationId,
          taxType: dto.taxType,
          periodStart,
          periodEnd,
          filingDeadline,
          paymentDeadline,
          year: dto.year,
          quarter: dto.quarter,
          month: dto.month,
          status: TaxPeriodStatus.OPEN,
        },
      });

      this.logger.log(`Tax period created: ${taxPeriod.id}`);
      return taxPeriod;
    } catch (error: any) {
      this.logger.error(
        `Failed to create tax period: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get tax periods for organization
   */
  async getTaxPeriods(
    organizationId: string,
    taxType?: TaxType,
    year?: number,
    status?: TaxPeriodStatus
  ): Promise<TaxPeriodWithObligations[]> {
    try {
      const where: any = { organizationId };
      if (taxType) where.taxType = taxType;
      if (year) where.year = year;
      if (status) where.status = status;

      const periods = await this.prisma.taxPeriod.findMany({
        where,
        include: {
          obligations: {
            select: {
              id: true,
              obligationType: true,
              amountDue: true,
              amountPaid: true,
              status: true,
              dueDate: true,
            },
          },
        },
        orderBy: [{ year: 'desc' }, { quarter: 'desc' }, { month: 'desc' }],
      });

      // Map periods to convert Decimal to number for obligations
      const periodsWithNumbers = periods.map(period => ({
        ...period,
        obligations: period.obligations.map(obligation => ({
          ...obligation,
          amountDue: obligation.amountDue.toNumber(),
          amountPaid: obligation.amountPaid.toNumber(),
        })),
      }));

      return periodsWithNumbers;
    } catch (error: any) {
      this.logger.error(
        `Failed to get tax periods: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get tax calendar for organization
   */
  async getTaxCalendar(
    organizationId: string,
    year?: number
  ): Promise<TaxCalendarEntry[]> {
    try {
      const currentYear = year || new Date().getFullYear();
      const periods = await this.getTaxPeriods(
        organizationId,
        undefined,
        currentYear
      );

      const calendar: TaxCalendarEntry[] = periods.map(period => {
        const now = new Date();
        const isOverdue =
          period.filingDeadline < now &&
          period.status !== TaxPeriodStatus.FILED;
        const daysUntilDeadline = Math.ceil(
          (period.filingDeadline.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return {
          taxType: period.taxType,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          filingDeadline: period.filingDeadline,
          paymentDeadline: period.paymentDeadline,
          status: period.status,
          isOverdue,
          daysUntilDeadline,
        };
      });

      return calendar.sort(
        (a, b) => a.filingDeadline.getTime() - b.filingDeadline.getTime()
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to get tax calendar: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Close tax period
   */
  async closeTaxPeriod(
    organizationId: string,
    periodId: string
  ): Promise<TaxPeriod> {
    try {
      const period = await this.prisma.taxPeriod.findFirst({
        where: { id: periodId, organizationId },
      });

      if (!period) {
        throw new NotFoundException('Tax period not found');
      }

      if (period.status !== TaxPeriodStatus.OPEN) {
        throw new BadRequestException('Only open periods can be closed');
      }

      const updatedPeriod = await this.prisma.taxPeriod.update({
        where: { id: periodId },
        data: { status: TaxPeriodStatus.CLOSED },
      });

      this.logger.log(`Tax period closed: ${periodId}`);
      return updatedPeriod;
    } catch (error: any) {
      this.logger.error(
        `Failed to close tax period: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Mark tax period as filed
   */
  async markAsFiled(
    organizationId: string,
    periodId: string,
    filingReference?: string,
    filedBy?: string
  ): Promise<TaxPeriod> {
    try {
      const period = await this.prisma.taxPeriod.findFirst({
        where: { id: periodId, organizationId },
      });

      if (!period) {
        throw new NotFoundException('Tax period not found');
      }

      const updatedPeriod = await this.prisma.taxPeriod.update({
        where: { id: periodId },
        data: {
          status: TaxPeriodStatus.FILED,
          filedAt: new Date(),
          filedBy,
          filingReference,
        },
      });

      this.logger.log(`Tax period marked as filed: ${periodId}`);
      return updatedPeriod;
    } catch (error: any) {
      this.logger.error(
        `Failed to mark period as filed: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Generate tax periods for a year
   */
  async generatePeriodsForYear(
    organizationId: string,
    year: number,
    taxTypes?: TaxType[]
  ): Promise<TaxPeriod[]> {
    try {
      this.logger.log(`Generating tax periods for year ${year}`);

      const typesToGenerate =
        taxTypes || (Object.keys(this.TAX_PERIOD_CONFIG) as TaxType[]);
      const createdPeriods: TaxPeriod[] = [];

      for (const taxType of typesToGenerate) {
        const config = this.TAX_PERIOD_CONFIG[taxType];
        if (!config) continue;

        if (config.frequency === 'monthly') {
          // Generate 12 monthly periods
          for (let month = 1; month <= 12; month++) {
            try {
              const period = await this.createTaxPeriod({
                organizationId,
                taxType,
                year,
                month,
              });
              createdPeriods.push(period);
            } catch (error) {
              // Period might already exist, continue
              this.logger.warn(
                `Period already exists for ${taxType} ${year}-${month}`
              );
            }
          }
        } else if (config.frequency === 'quarterly') {
          // Generate 4 quarterly periods
          for (let quarter = 1; quarter <= 4; quarter++) {
            try {
              const period = await this.createTaxPeriod({
                organizationId,
                taxType,
                year,
                quarter,
              });
              createdPeriods.push(period);
            } catch (error) {
              // Period might already exist, continue
              this.logger.warn(
                `Period already exists for ${taxType} ${year}-Q${quarter}`
              );
            }
          }
        } else if (config.frequency === 'annually') {
          // Generate 1 annual period
          try {
            const period = await this.createTaxPeriod({
              organizationId,
              taxType,
              year,
            });
            createdPeriods.push(period);
          } catch (error) {
            // Period might already exist, continue
            this.logger.warn(`Period already exists for ${taxType} ${year}`);
          }
        }
      }

      this.logger.log(
        `Generated ${createdPeriods.length} tax periods for year ${year}`
      );
      return createdPeriods;
    } catch (error: any) {
      this.logger.error(
        `Failed to generate periods for year: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Calculate period start and end dates
   */
  private calculatePeriodDates(
    dto: CreateTaxPeriodDto,
    config: any
  ): { periodStart: Date; periodEnd: Date } {
    if (dto.customPeriodStart && dto.customPeriodEnd) {
      return {
        periodStart: dto.customPeriodStart,
        periodEnd: dto.customPeriodEnd,
      };
    }

    const year = dto.year;

    if (config.frequency === 'monthly' && dto.month) {
      const periodStart = new Date(year, dto.month - 1, 1);
      const periodEnd = new Date(year, dto.month, 0); // Last day of month
      return { periodStart, periodEnd };
    }

    if (config.frequency === 'quarterly' && dto.quarter) {
      const startMonth = (dto.quarter - 1) * 3;
      const periodStart = new Date(year, startMonth, 1);
      const periodEnd = new Date(year, startMonth + 3, 0); // Last day of quarter
      return { periodStart, periodEnd };
    }

    if (config.frequency === 'annually') {
      const periodStart = new Date(year, 0, 1); // January 1st
      const periodEnd = new Date(year, 11, 31); // December 31st
      return { periodStart, periodEnd };
    }

    throw new BadRequestException('Invalid period configuration');
  }

  /**
   * Calculate filing and payment deadlines
   */
  private calculateDeadlines(
    periodEnd: Date,
    config: any
  ): { filingDeadline: Date; paymentDeadline: Date } {
    const filingDeadline = new Date(periodEnd);
    filingDeadline.setDate(
      filingDeadline.getDate() + config.filingDaysAfterPeriod
    );

    const paymentDeadline = new Date(periodEnd);
    paymentDeadline.setDate(
      paymentDeadline.getDate() + config.paymentDaysAfterPeriod
    );

    return { filingDeadline, paymentDeadline };
  }
}
